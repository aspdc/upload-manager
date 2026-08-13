"use client";

import { useCallback, useEffect, useState } from "react";
import { KpiCards } from "@/components/app/kpi-cards";
import { MessagePanel, COPY } from "@/components/app/messages";
import { OpenInCloudflareButton } from "@/components/app/open-in-cloudflare-button";
import { UploadZone } from "@/components/upload/upload-zone";
import { apiClient } from "@/lib/api-client";
import type { UserTarget } from "@/modules/target";
import type { UsageResponse } from "@/modules/usage";

type UploadTabProps = {
  target: UserTarget | null;
  onUploadComplete?: () => void;
};

function usageMessage(usage: UsageResponse | null): {
  title: string;
  description: string;
} | null {
  if (!usage?.error) {
    return null;
  }

  if (usage.errorCode === "no_token") {
    return COPY.usageNoToken;
  }

  if (usage.errorCode === "missing_scopes") {
    return COPY.usageMissingScopes;
  }

  return {
    title: COPY.usageUnavailable.title,
    description: usage.error,
  };
}

export function UploadTab({ target, onUploadComplete }: UploadTabProps) {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsage = useCallback(async () => {
    if (!target) {
      setUsage(null);
      return;
    }

    setLoading(true);

    const response = await apiClient.api.usage.get();

    if (response.error) {
      setUsage({
        error: "Usage data is unavailable right now.",
        errorCode: "api_unavailable",
      });
      setLoading(false);
      return;
    }

    setUsage(response.data ?? null);
    setLoading(false);
  }, [target]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client fetch on target change
    void loadUsage();
  }, [loadUsage]);

  const usageAlert = usageMessage(usage);
  const dashboardUrl = usage?.dashboardUrl ?? null;

  return (
    <div className="space-y-6">
      {!target ? (
        <MessagePanel
          title={COPY.noTarget.title}
          description={COPY.noTarget.description}
        />
      ) : null}

      {usageAlert ? (
        <MessagePanel
          title={usageAlert.title}
          description={usageAlert.description}
          variant="destructive"
        />
      ) : null}

      <KpiCards
        usage={usage}
        loading={loading}
        onRefresh={() => void loadUsage()}
        lastUpdated={usage?.lastUpdated}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Upload images</h2>
          <p className="text-xs text-muted-foreground">
            Images only, up to 10 MB each. No in-app file browser.
          </p>
        </div>
        <OpenInCloudflareButton
          dashboardUrl={dashboardUrl}
          disabled={!target}
        />
      </div>

      <UploadZone
        disabled={!target}
        target={target}
        onUploadComplete={() => onUploadComplete?.()}
      />
    </div>
  );
}
