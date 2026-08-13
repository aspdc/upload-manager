"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { compressImageToMaxBytes } from "@/components/upload/compress-image";
import { findAvailableCopyKey } from "@/components/upload/conflict-utils";
import { UploadConflictDialog } from "@/components/upload/upload-conflict-dialog";
import {
  UploadFileList,
  type UploadFileEntry,
} from "@/components/upload/upload-file-list";
import { UploadDropzone } from "@/components/upload/upload-dropzone";
import { UploadNameDialog } from "@/components/upload/upload-name-dialog";
import {
  UploadOversizedDialog,
  type OversizedStrategy,
} from "@/components/upload/upload-oversized-dialog";
import { UploadSuccessDialog } from "@/components/upload/upload-success-dialog";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
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

type OversizedQueueItem = {
  entryId: string;
  fileName: string;
  fileSize: number;
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
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [batchName, setBatchName] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<UploadResult | null>(null);
  const [activeConflict, setActiveConflict] =
    useState<ConflictQueueItem | null>(null);
  const [activeOversized, setActiveOversized] =
    useState<OversizedQueueItem | null>(null);
  const conflictResolverRef = useRef<
    | ((
        value: { strategy: ConflictStrategy; applyToAll: boolean } | null,
      ) => void)
    | null
  >(null);
  const oversizedResolverRef = useRef<
    | ((
        value: { strategy: OversizedStrategy; applyToAll: boolean } | null,
      ) => void)
    | null
  >(null);
  const nameResolverRef = useRef<((value: string | null) => void) | null>(null);

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
    return new Promise<{
      strategy: ConflictStrategy;
      applyToAll: boolean;
    } | null>((resolve) => {
      conflictResolverRef.current = resolve;
    });
  }, []);

  const waitForOversizedChoice = useCallback((item: OversizedQueueItem) => {
    setActiveOversized(item);
    return new Promise<{
      strategy: OversizedStrategy;
      applyToAll: boolean;
    } | null>((resolve) => {
      oversizedResolverRef.current = resolve;
    });
  }, []);

  const waitForBatchName = useCallback((incoming: File[]) => {
    setPendingFiles(incoming);
    return new Promise<string | null>((resolve) => {
      nameResolverRef.current = resolve;
    });
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
    conflictResolverRef.current?.(null);
    conflictResolverRef.current = null;
    setActiveConflict(null);
  }, []);

  const handleOversizedResolve = useCallback(
    (strategy: OversizedStrategy, applyToAll: boolean) => {
      oversizedResolverRef.current?.({ strategy, applyToAll });
      oversizedResolverRef.current = null;
      setActiveOversized(null);
    },
    [],
  );

  const handleOversizedCancel = useCallback(() => {
    oversizedResolverRef.current?.(null);
    oversizedResolverRef.current = null;
    setActiveOversized(null);
  }, []);

  const handleNameConfirm = useCallback((name: string) => {
    nameResolverRef.current?.(name);
    nameResolverRef.current = null;
    setPendingFiles(null);
  }, []);

  const handleNameCancel = useCallback(() => {
    nameResolverRef.current?.(null);
    nameResolverRef.current = null;
    setPendingFiles(null);
  }, []);

  const resolveOversized = useCallback(
    async (entries: UploadFileEntry[]) => {
      const kept: UploadFileEntry[] = [];
      let batchStrategy: OversizedStrategy | null = null;

      for (const entry of entries) {
        if (entry.file.size <= MAX_UPLOAD_BYTES) {
          kept.push(entry);
          continue;
        }

        let chosenStrategy: OversizedStrategy;

        if (batchStrategy) {
          chosenStrategy = batchStrategy;
        } else {
          const choice = await waitForOversizedChoice({
            entryId: entry.id,
            fileName: entry.originalKey,
            fileSize: entry.file.size,
          });
          if (!choice) {
            throw new Error("Upload cancelled");
          }
          chosenStrategy = choice.strategy;
          if (choice.applyToAll) {
            batchStrategy = choice.strategy;
          }
        }

        if (chosenStrategy === "skip") {
          continue;
        }

        const compressed = await compressImageToMaxBytes(entry.file);
        const validation = validateImageFile({
          name: compressed.name,
          type: compressed.type,
          size: compressed.size,
        });
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        kept.push({
          ...entry,
          file: compressed,
          originalKey: compressed.name,
          resolvedKey: compressed.name,
        });
      }

      return kept;
    },
    [waitForOversizedChoice],
  );

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
          if (!choice) {
            throw new Error("Upload cancelled");
          }
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
      setSuccessResult(null);
      setBatchName(null);

      const nextEntries: UploadFileEntry[] = [];

      for (const file of incomingFiles) {
        const validation = validateImageFile(
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
          },
          { allowOversized: true },
        );

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

      let sizedEntries: UploadFileEntry[];
      try {
        sizedEntries = await resolveOversized(nextEntries);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload cancelled";
        setQueueError(message);
        setIsProcessing(false);
        setFiles([]);
        return;
      }

      if (sizedEntries.length === 0) {
        setQueueError("No files left to upload");
        setIsProcessing(false);
        setFiles([]);
        return;
      }

      setFiles(sizedEntries);

      const chosenName = await waitForBatchName(
        sizedEntries.map((entry) => entry.file),
      );
      if (!chosenName) {
        setIsProcessing(false);
        setFiles([]);
        return;
      }

      setBatchName(chosenName);

      let resolvedEntries: UploadFileEntry[];
      try {
        resolvedEntries = await resolveConflicts(sizedEntries);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload cancelled";
        setQueueError(message);
        setIsProcessing(false);
        return;
      }

      setFiles(
        resolvedEntries.map((entry) => ({
          ...entry,
          status: "uploading" as const,
          error: undefined,
        })),
      );

      const result = await uploadFiles({
        target,
        files: resolvedEntries.map((entry) => entry.file),
        keys: resolvedEntries.map((entry) => entry.resolvedKey),
        batchName: chosenName,
      });

      if ("error" in result && !("items" in result)) {
        setFiles((current) =>
          current.map((item) => ({
            ...item,
            status: "failed",
            error: result.error,
          })),
        );
        setQueueError(result.error);
        setIsProcessing(false);
        return;
      }

      const uploadedByKey = new Map(
        result.items.map((item) => [item.key, item] as const),
      );

      setFiles((current) =>
        current.map((item) => {
          const uploaded = uploadedByKey.get(item.resolvedKey);
          if (!uploaded) {
            return {
              ...item,
              status: "failed",
              error: result.error ?? "Upload failed",
            };
          }
          return {
            ...item,
            status: "done",
            publicUrl: uploaded.publicUrl,
            resolvedKey: uploaded.key,
          };
        }),
      );

      if (result.items.length === 0) {
        setQueueError(result.error ?? "Upload failed");
        setIsProcessing(false);
        return;
      }

      const uploadResult: UploadResult = {
        items: result.items,
        copyPayload: result.copyPayload,
        batchName: result.batchName ?? chosenName,
        historySaved: result.historySaved,
        error: result.error,
      };

      setSuccessResult(uploadResult);
      onUploadComplete?.(uploadResult);
      setIsProcessing(false);

      if (result.error) {
        setQueueError(result.error);
      } else {
        setFiles([]);
      }
    },
    [
      disabled,
      onUploadComplete,
      resolveConflicts,
      resolveOversized,
      target,
      waitForBatchName,
    ],
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
              <p className="text-xs font-medium">
                {batchName ? batchName : "Overall progress"}
              </p>
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
            setBatchName(null);
          }}
        >
          Clear queue
        </Button>
      ) : null}

      <UploadOversizedDialog
        open={activeOversized !== null}
        fileName={activeOversized?.fileName ?? ""}
        fileSize={activeOversized?.fileSize ?? 0}
        maxBytes={MAX_UPLOAD_BYTES}
        onResolve={handleOversizedResolve}
        onCancel={handleOversizedCancel}
      />

      <UploadNameDialog
        key={
          pendingFiles
            ? `name-${pendingFiles.length}-${files[0]?.id ?? "new"}`
            : "name-closed"
        }
        open={pendingFiles !== null}
        fileCount={pendingFiles?.length ?? 0}
        onConfirm={handleNameConfirm}
        onCancel={handleNameCancel}
      />

      <UploadConflictDialog
        open={activeConflict !== null}
        fileName={activeConflict?.originalKey ?? ""}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />

      <UploadSuccessDialog
        open={successResult !== null}
        result={successResult}
        onClose={() => setSuccessResult(null)}
      />
    </div>
  );
}
