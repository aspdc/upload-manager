"use client";

import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type MessagePanelProps = {
  title: string;
  description: string;
  className?: string;
  variant?: "default" | "destructive";
};

export function MessagePanel({
  title,
  description,
  className,
  variant = "default",
}: MessagePanelProps) {
  return (
    <Alert variant={variant} className={cn(className)}>
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

export const COPY = {
  noTarget: {
    title: "No bucket selected",
    description:
      "Choose a Cloudflare account and a public R2 bucket before uploading or viewing history.",
  },
  noPublicBuckets: {
    title: "No public buckets found",
    description:
      "Turn on the Public Development URL (r2.dev) for at least one bucket in the Cloudflare dashboard, then come back and pick a bucket.",
  },
  usageUnavailable: {
    title: "Usage data unavailable",
    description:
      "We could not load your account meters right now. Try Refresh, or reconnect your Cloudflare account if scopes are missing.",
  },
  usageNoToken: {
    title: "Cloudflare connection expired",
    description:
      "Sign out and sign in again with Cloudflare so we can read usage and billing for your account.",
  },
  usageMissingScopes: {
    title: "Missing Cloudflare permissions",
    description:
      "Reconnect and approve Account Analytics Read and Billing Read so usage and cost cards can load.",
  },
  historyEmpty: {
    title: "No uploads yet",
    description:
      "Successful uploads for this bucket will appear here so you can copy public URLs again.",
  },
  uploadZoneStub: {
    title: "Upload zone",
    description:
      "Drag and drop images here once the uploader is connected. Each file must be an image up to 10 MB.",
  },
  uploadDisabled: {
    title: "Uploads are paused",
    description:
      "Select a bucket first. Uploading stays disabled until your target is set.",
  },
} as const;
