"use client";

import { useCallback, useEffect, useState } from "react";
import { tryCatch } from "@/lib/try-catch";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { MessagePanel, COPY } from "@/components/app/messages";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/api-client";
import type { HistoryBatch } from "@/modules/history";
import type { UserTarget } from "@/modules/target";

type HistoryTabProps = {
  target: UserTarget | null;
  refreshKey?: number;
};

export function HistoryTab({ target, refreshKey = 0 }: HistoryTabProps) {
  const [batches, setBatches] = useState<HistoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!target) {
      setBatches([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await apiClient.api.history.get();

    if (response.error) {
      setError("Failed to load upload history");
      setBatches([]);
      setLoading(false);
      return;
    }

    const payload = response.data;
    if (!payload || "error" in payload) {
      const message =
        payload && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Failed to load upload history";
      setError(message);
      setBatches([]);
      setLoading(false);
      return;
    }

    setBatches(payload.batches);
    setLoading(false);
  }, [target]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client fetch on target/refresh change
    void loadHistory();
  }, [loadHistory, refreshKey]);

  async function copyBatch(batch: HistoryBatch) {
    const { error: clipboardError } = await tryCatch(
      navigator.clipboard.writeText(batch.copyPayload),
    );

    if (clipboardError) {
      toast.error("Could not copy URLs to your clipboard");
      return;
    }

    toast.success(
      batch.itemCount === 1
        ? "Copied public URL"
        : `Copied ${batch.itemCount} URLs`,
    );
  }

  if (!target) {
    return (
      <MessagePanel
        title={COPY.noTarget.title}
        description={COPY.noTarget.description}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <MessagePanel
        title="History unavailable"
        description={error}
        variant="destructive"
      />
    );
  }

  if (batches.length === 0) {
    return (
      <MessagePanel
        title={COPY.historyEmpty.title}
        description={COPY.historyEmpty.description}
      />
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => (
        <div
          key={batch.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{batch.name}</p>
            <p className="text-xs text-muted-foreground">
              {batch.itemCount === 1 ? "1 file" : `${batch.itemCount} files`} ·{" "}
              {new Date(batch.createdAt).toLocaleString()}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {batch.items.map((item) => item.key).join(", ")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copyBatch(batch)}
          >
            <CopyIcon data-icon="inline-start" />
            Copy URL{batch.itemCount === 1 ? "" : "s"}
          </Button>
        </div>
      ))}
    </div>
  );
}
