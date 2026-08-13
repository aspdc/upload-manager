"use client";

import { RefreshCwIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { KPI_LABELS } from "@/lib/constants";
import { formatBytes, formatCount, formatUsd } from "@/lib/format";
import type { UsageResponse } from "@/modules/usage";
import { cn } from "@/lib/utils";

type KpiCardsProps = {
  usage: UsageResponse | null;
  loading: boolean;
  onRefresh: () => void;
  lastUpdated?: string | null;
};

function OverAllowanceBadge({ show }: { show?: boolean }) {
  if (!show) {
    return null;
  }

  return (
    <Badge variant="destructive" className="mt-2">
      Over free allowance
    </Badge>
  );
}

export function KpiCards({
  usage,
  loading,
  onRefresh,
  lastUpdated,
}: KpiCardsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Account usage</h2>
          <p className="text-xs text-muted-foreground">
            {lastUpdated
              ? `Last updated ${new Date(lastUpdated).toLocaleString()}`
              : "Refresh to load the latest meters"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? (
            <Spinner className="mr-2" />
          ) : (
            <RefreshCwIcon data-icon="inline-start" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UsageCountCard
          title={KPI_LABELS.writesAndLists}
          meter={usage?.writesAndLists}
          loading={loading}
          formatValue={formatCount}
        />
        <UsageCountCard
          title={KPI_LABELS.readsAndChecks}
          meter={usage?.readsAndChecks}
          loading={loading}
          formatValue={formatCount}
        />
        <StorageCard storage={usage?.storage} loading={loading} />
        <CostCard cost={usage?.cost} loading={loading} />
      </div>
    </div>
  );
}

function UsageCountCard({
  title,
  meter,
  loading,
  formatValue,
}: {
  title: string;
  meter?: UsageResponse["writesAndLists"];
  loading: boolean;
  formatValue: (value: number) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Used / free allowance left</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner />
        ) : meter ? (
          <div>
            <p className="text-sm font-medium">
              {formatValue(meter.used)} used · {formatValue(meter.remaining)}{" "}
              left
            </p>
            <p className="text-xs text-muted-foreground">
              Free allowance: {formatValue(meter.allowance)}
            </p>
            <OverAllowanceBadge show={meter.overAllowance} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function StorageCard({
  storage,
  loading,
}: {
  storage?: UsageResponse["storage"];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{KPI_LABELS.storage}</CardTitle>
        <CardDescription>Used / free allowance left</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner />
        ) : storage ? (
          <div>
            <p className="text-sm font-medium">
              {formatBytes(storage.usedBytes)} used ·{" "}
              {formatBytes(storage.remainingBytes)} left
            </p>
            <p className="text-xs text-muted-foreground">
              Free allowance: {formatBytes(storage.allowanceBytes)}
            </p>
            <OverAllowanceBadge show={storage.overAllowance} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function CostCard({
  cost,
  loading,
}: {
  cost?: UsageResponse["cost"];
  loading: boolean;
}) {
  return (
    <Card className={cn(cost ? undefined : undefined)}>
      <CardHeader>
        <CardTitle>{KPI_LABELS.cost}</CardTitle>
        <CardDescription>Cycle-to-date and estimated next bill</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner />
        ) : cost ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {cost.cycleToDateUsd === null
                ? "Cycle-to-date unavailable"
                : `${formatUsd(cost.cycleToDateUsd)} cycle-to-date`}
            </p>
            <p className="text-xs text-muted-foreground">
              Estimated next bill: {formatUsd(cost.estimatedNextBillUsd)}{" "}
              (estimate)
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data yet</p>
        )}
      </CardContent>
    </Card>
  );
}
