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
import type { ConflictStrategy } from "@/modules/upload";

type UploadConflictDialogProps = {
  open: boolean;
  fileName: string;
  onResolve: (strategy: ConflictStrategy, applyToAll: boolean) => void;
  onCancel: () => void;
};

export function UploadConflictDialog({
  open,
  fileName,
  onResolve,
  onCancel,
}: UploadConflictDialogProps) {
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
          <DialogTitle>File already exists</DialogTitle>
          <DialogDescription>
            {fileName} already exists in this bucket. Choose whether to replace
            it or save a copy with a new name.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Checkbox
            id="apply-to-all"
            checked={applyToAll}
            onCheckedChange={(checked) => setApplyToAll(checked === true)}
          />
          <Label htmlFor="apply-to-all">Do this for all</Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onResolve("copy", applyToAll)}
          >
            Create copy
          </Button>
          <Button onClick={() => onResolve("overwrite", applyToAll)}>
            Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
