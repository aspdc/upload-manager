"use client";

import { ExternalLinkIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OpenInCloudflareButtonProps = {
  dashboardUrl?: string | null;
  disabled?: boolean;
};

export function OpenInCloudflareButton({
  dashboardUrl,
  disabled = false,
}: OpenInCloudflareButtonProps) {
  if (!dashboardUrl || disabled) {
    return (
      <Button variant="outline" disabled>
        <ExternalLinkIcon data-icon="inline-start" />
        Open in Cloudflare
      </Button>
    );
  }

  return (
    <a
      href={dashboardUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      <ExternalLinkIcon data-icon="inline-start" />
      Open in Cloudflare
    </a>
  );
}
