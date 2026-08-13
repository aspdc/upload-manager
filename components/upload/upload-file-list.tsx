"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type UploadFileStatus =
  "pending" | "uploading" | "done" | "failed" | "skipped";

export type UploadFileEntry = {
  id: string;
  file: File;
  originalKey: string;
  resolvedKey: string;
  status: UploadFileStatus;
  error?: string;
  publicUrl?: string;
};

type UploadFileListProps = {
  files: UploadFileEntry[];
  className?: string;
};

function statusLabel(status: UploadFileStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "uploading":
      return "Uploading";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
    case "skipped":
      return "Skipped";
  }
}

function statusVariant(status: UploadFileStatus) {
  switch (status) {
    case "done":
      return "default" as const;
    case "failed":
      return "destructive" as const;
    case "uploading":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function UploadFileList({ files, className }: UploadFileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {files.map((entry) => (
        <div
          key={entry.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-card-foreground">
              {entry.resolvedKey}
            </p>
            {entry.resolvedKey !== entry.originalKey ? (
              <p className="truncate text-xs text-muted-foreground">
                Original: {entry.originalKey}
              </p>
            ) : null}
            {entry.error ? (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{entry.error}</AlertDescription>
              </Alert>
            ) : null}
            {entry.publicUrl ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {entry.publicUrl}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {entry.status === "uploading" ? <Spinner /> : null}
            <Badge variant={statusVariant(entry.status)}>
              {statusLabel(entry.status)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
