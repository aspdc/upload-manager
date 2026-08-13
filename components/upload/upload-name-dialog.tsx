"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadNameDialogProps = {
  open: boolean;
  fileCount: number;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export function UploadNameDialog({
  open,
  fileCount,
  onConfirm,
  onCancel,
}: UploadNameDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this upload a name");
      return;
    }
    if (trimmed.length > 100) {
      setError("Name must be 100 characters or fewer");
      return;
    }
    onConfirm(trimmed);
  }

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
          <DialogTitle>Name this upload</DialogTitle>
          <DialogDescription>
            {fileCount === 1
              ? "This name shows up in History so you can find the file later."
              : `This name shows up in History for all ${fileCount} files.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="upload-batch-name">Upload name</Label>
          <Input
            id="upload-batch-name"
            value={name}
            autoFocus
            maxLength={100}
            placeholder="e.g. Wedding reception — May"
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={submit}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
