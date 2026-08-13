"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { findAvailableCopyKey } from "@/components/upload/conflict-utils";
import { UploadConflictDialog } from "@/components/upload/upload-conflict-dialog";
import {
  UploadFileList,
  type UploadFileEntry,
} from "@/components/upload/upload-file-list";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { checkUploadConflicts, uploadFiles } from "@/lib/upload-api";
import type {
  ConflictStrategy,
  UploadResult,
  UploadTarget,
} from "@/modules/upload";
import { validateImageFile } from "@/modules/upload";

type UploadPanelProps = {
  target: UploadTarget;
  disabled?: boolean;
  onUploadComplete?: (result: UploadResult) => void;
  className?: string;
};

type ConflictQueueItem = {
  entryId: string;
  originalKey: string;
};

function createEntryId() {
  return crypto.randomUUID();
}

export function UploadPanel({
  target,
  disabled = false,
  onUploadComplete,
  className,
}: UploadPanelProps) {
  const [files, setFiles] = useState<UploadFileEntry[]>([]);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeConflict, setActiveConflict] =
    useState<ConflictQueueItem | null>(null);
  const conflictResolverRef = useRef<
    | ((value: { strategy: ConflictStrategy; applyToAll: boolean }) => void)
    | null
  >(null);

  const completedCount = useMemo(
    () => files.filter((file) => file.status === "done").length,
    [files],
  );

  const progressValue = useMemo(() => {
    if (files.length === 0) {
      return 0;
    }
    return Math.round((completedCount / files.length) * 100);
  }, [completedCount, files.length]);

  const waitForConflictChoice = useCallback((item: ConflictQueueItem) => {
    setActiveConflict(item);
    return new Promise<{ strategy: ConflictStrategy; applyToAll: boolean }>(
      (resolve) => {
        conflictResolverRef.current = resolve;
      },
    );
  }, []);

  const handleConflictResolve = useCallback(
    (strategy: ConflictStrategy, applyToAll: boolean) => {
      conflictResolverRef.current?.({ strategy, applyToAll });
      conflictResolverRef.current = null;
      setActiveConflict(null);
    },
    [],
  );

  const handleConflictCancel = useCallback(() => {
    conflictResolverRef.current = null;
    setActiveConflict(null);
    setIsProcessing(false);
    setQueueError("Upload cancelled");
  }, []);

  const resolveConflicts = useCallback(
    async (entries: UploadFileEntry[]) => {
      const conflictResult = await checkUploadConflicts({
        accountId: target.accountId,
        bucketName: target.bucketName,
        keys: entries.map((entry) => entry.originalKey),
      });

      if ("error" in conflictResult) {
        throw new Error(conflictResult.error);
      }

      const resolvedEntries = entries.map((entry) => ({
        ...entry,
        resolvedKey: entry.originalKey,
      }));

      const reservedKeys = new Set(
        resolvedEntries
          .filter(
            (entry) => !conflictResult.conflicts.includes(entry.originalKey),
          )
          .map((entry) => entry.resolvedKey),
      );

      let batchStrategy: ConflictStrategy | null = null;

      for (const entry of resolvedEntries) {
        if (!conflictResult.conflicts.includes(entry.originalKey)) {
          continue;
        }

        let chosenStrategy: ConflictStrategy;

        if (batchStrategy) {
          chosenStrategy = batchStrategy;
        } else {
          const choice = await waitForConflictChoice({
            entryId: entry.id,
            originalKey: entry.originalKey,
          });
          chosenStrategy = choice.strategy;
          if (choice.applyToAll) {
            batchStrategy = choice.strategy;
          }
        }

        if (chosenStrategy === "overwrite") {
          entry.resolvedKey = entry.originalKey;
          reservedKeys.add(entry.resolvedKey);
          continue;
        }

        const copyKey = await findAvailableCopyKey({
          target,
          originalKey: entry.originalKey,
          reservedKeys,
        });
        entry.resolvedKey = copyKey;
        reservedKeys.add(copyKey);
      }

      return resolvedEntries;
    },
    [target, waitForConflictChoice],
  );

  const startUpload = useCallback(
    async (incomingFiles: File[]) => {
      if (disabled || incomingFiles.length === 0) {
        return;
      }

      setQueueError(null);
      setIsProcessing(true);

      const nextEntries: UploadFileEntry[] = [];

      for (const file of incomingFiles) {
        const validation = validateImageFile({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        });

        if (!validation.valid) {
          setQueueError(validation.error);
          setIsProcessing(false);
          return;
        }

        nextEntries.push({
          id: createEntryId(),
          file,
          originalKey: file.name,
          resolvedKey: file.name,
          status: "pending",
        });
      }

      setFiles(nextEntries);

      let resolvedEntries: UploadFileEntry[];
      try {
        resolvedEntries = await resolveConflicts(nextEntries);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload cancelled";
        setQueueError(message);
        setIsProcessing(false);
        return;
      }

      setFiles(resolvedEntries);

      const uploadedItems: UploadResult["items"] = [];

      for (const entry of resolvedEntries) {
        setFiles((current) =>
          current.map((item) =>
            item.id === entry.id
              ? { ...item, status: "uploading", error: undefined }
              : item,
          ),
        );

        const result = await uploadFiles({
          target,
          files: [entry.file],
          keys: [entry.resolvedKey],
        });

        if ("error" in result) {
          setFiles((current) =>
            current.map((item) =>
              item.id === entry.id
                ? { ...item, status: "failed", error: result.error }
                : item,
            ),
          );
          setQueueError(result.error);
          setIsProcessing(false);
          return;
        }

        const uploaded = result.items[0];
        if (!uploaded) {
          setQueueError(`Upload failed for ${entry.resolvedKey}`);
          setIsProcessing(false);
          return;
        }

        uploadedItems.push(uploaded);

        setFiles((current) =>
          current.map((item) =>
            item.id === entry.id
              ? {
                  ...item,
                  status: "done",
                  publicUrl: uploaded.publicUrl,
                  resolvedKey: uploaded.key,
                }
              : item,
          ),
        );
      }

      const uploadResult: UploadResult = {
        items: uploadedItems,
        copyPayload: uploadedItems.map((item) => item.publicUrl).join(","),
      };

      onUploadComplete?.(uploadResult);
      setFiles([]);
      setIsProcessing(false);
    },
    [disabled, onUploadComplete, resolveConflicts, target],
  );

  return (
    <div className={className}>
      <UploadDropzone
        disabled={disabled || isProcessing}
        onFilesSelected={(selectedFiles) => {
          void startUpload(selectedFiles);
        }}
      />

      {files.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Overall progress</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {completedCount} / {files.length} uploaded
              </p>
            </div>
            <Progress value={progressValue} />
          </div>
          <UploadFileList files={files} />
        </div>
      ) : null}

      {queueError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Upload issue</AlertTitle>
          <AlertDescription>{queueError}</AlertDescription>
        </Alert>
      ) : null}

      {files.length > 0 && !isProcessing ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            setFiles([]);
            setQueueError(null);
          }}
        >
          Clear queue
        </Button>
      ) : null}

      <UploadConflictDialog
        open={activeConflict !== null}
        fileName={activeConflict?.originalKey ?? ""}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}
