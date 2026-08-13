"use client";

import { toast } from "sonner";
import { MessagePanel, COPY } from "@/components/app/messages";
import { UploadPanel } from "@/components/upload/upload-panel";
import { apiClient } from "@/lib/api-client";
import { tryCatch } from "@/lib/try-catch";
import type { UserTarget } from "@/modules/target";
import type { UploadResult } from "@/modules/upload";

type UploadZoneProps = {
  target: UserTarget | null;
  disabled?: boolean;
  className?: string;
  onHistorySaved?: () => void;
};

export function UploadZone({
  target,
  disabled = false,
  className,
  onHistorySaved,
}: UploadZoneProps) {
  if (!target || disabled) {
    return (
      <MessagePanel
        title={COPY.uploadDisabled.title}
        description={COPY.uploadDisabled.description}
        className={className}
      />
    );
  }

  const selectedTarget = target;

  async function handleUploadComplete(result: UploadResult) {
    const { error } = await tryCatch(
      apiClient.api.history.post({
        accountId: selectedTarget.accountId,
        bucketName: selectedTarget.bucketName,
        publicBaseUrl: selectedTarget.publicBaseUrl,
        items: result.items.map((item) => ({
          key: item.key,
          publicUrl: item.publicUrl,
        })),
      }),
    );

    if (error) {
      toast.error("Upload succeeded but history could not be saved");
      return;
    }

    toast.success(
      result.items.length === 1
        ? "Uploaded 1 file"
        : `Uploaded ${result.items.length} files`,
    );
    onHistorySaved?.();
  }

  return (
    <UploadPanel
      target={{
        accountId: selectedTarget.accountId,
        bucketName: selectedTarget.bucketName,
        publicBaseUrl: selectedTarget.publicBaseUrl,
      }}
      disabled={disabled}
      className={className}
      onUploadComplete={(result) => {
        void handleUploadComplete(result);
      }}
    />
  );
}
