"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/components/upload/compress-image";

export type OversizedStrategy = "compress" | "skip";

type UploadOversizedDialogProps = {
  open: boolean;
  fileName: string;
  fileSize: number;
  maxBytes: number;
  onResolve: (strategy: OversizedStrategy, applyToAll: boolean) => void;
  onCancel: () => void;
};

export function UploadOversizedDialog({
  open,
  fileName,
  fileSize,
  maxBytes,
  onResolve,
  onCancel,
}: UploadOversizedDialogProps) {
  const [applyToAll, setApplyToAll] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>File is too large</DialogTitle>
          <DialogDescription>
            {fileName} is {formatBytes(fileSize)}. Max is{" "}
            {formatBytes(maxBytes)}. Compress it (keeps aspect ratio; slight
            quality loss) or skip this file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Checkbox
            id="oversized-apply-to-all"
            checked={applyToAll}
            onCheckedChange={(checked) => setApplyToAll(checked === true)}
          />
          <Label htmlFor="oversized-apply-to-all">
            Do this for all oversized files
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onResolve("skip", applyToAll)}
          >
            Skip
          </Button>
          <Button onClick={() => onResolve("compress", applyToAll)}>
            Compress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
