"use client";

import { MessagePanel, COPY } from "@/components/app/messages";
import { UploadPanel } from "@/components/upload/upload-panel";
import type { UserTarget } from "@/modules/target";
import type { UploadResult } from "@/modules/upload";

type UploadZoneProps = {
  target: UserTarget | null;
  disabled?: boolean;
  className?: string;
  onUploadComplete?: (result: UploadResult) => void;
};

export function UploadZone({
  target,
  disabled = false,
  className,
  onUploadComplete,
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

  return (
    <UploadPanel
      target={{
        accountId: target.accountId,
        bucketName: target.bucketName,
        publicBaseUrl: target.publicBaseUrl,
      }}
      disabled={disabled}
      className={className}
      onUploadComplete={onUploadComplete}
    />
  );
}
