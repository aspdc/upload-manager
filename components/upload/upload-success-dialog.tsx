"use client";

import { useState } from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tryCatch } from "@/lib/try-catch";
import type { UploadResult } from "@/modules/upload";

type UploadSuccessDialogProps = {
  open: boolean;
  result: UploadResult | null;
  onClose: () => void;
};

export function UploadSuccessDialog({
  open,
  result,
  onClose,
}: UploadSuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copyUrls() {
    if (!result?.copyPayload) {
      return;
    }

    const { error } = await tryCatch(
      navigator.clipboard.writeText(result.copyPayload),
    );

    if (error) {
      toast.error("Could not copy URLs to your clipboard");
      return;
    }

    setCopied(true);
    toast.success(
      result.items.length === 1
        ? "Copied public URL"
        : `Copied ${result.items.length} URLs`,
    );
  }

  const count = result?.items.length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {result?.batchName ? result.batchName : "Upload complete"}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Your file is public. Copy the URL below."
              : `${count} files are public. Copy the comma-separated URLs below.`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="break-all font-mono text-xs text-foreground">
            {result?.copyPayload ?? ""}
          </p>
        </div>

        {result?.error ? (
          <p className="text-xs text-destructive">{result.error}</p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setCopied(false);
              onClose();
            }}
          >
            Done
          </Button>
          <Button onClick={() => void copyUrls()}>
            <CopyIcon data-icon="inline-start" />
            {copied ? "Copied" : count === 1 ? "Copy URL" : "Copy URLs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
