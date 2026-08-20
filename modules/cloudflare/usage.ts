import { R2_FREE_ALLOWANCE, R2_PRICING } from "@/lib/constants";
import { tryCatch } from "@/lib/try-catch";
import type { RawUsageMeters } from "./cloudflare.schema";
import { buildDashboardUrl } from "./r2";

const CLOUDFLARE_GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";

type GraphQlResponse = {
  data?: {
    viewer?: {
      accounts?: Array<{
        r2StorageAdaptiveGroups?: Array<{
          max?: {
            payloadSize?: number;
            metadataSize?: number;
          };
        }>;
        r2OperationsAdaptiveGroups?: Array<{
          sum?: {
            requests?: number;
          };
          dimensions?: {
            actionType?: string;
          };
        }>;
      }>;
    };
  };
  errors?: Array<{ message: string }>;
};

const CLASS_A_ACTIONS = new Set([
  "PutObject",
  "CopyObject",
  "ListBuckets",
  "ListObjects",
  "CreateMultipartUpload",
  "UploadPart",
  "CompleteMultipartUpload",
  "UploadPartCopy",
  "ListMultipartUploads",
  "ListParts",
]);

const CLASS_B_ACTIONS = new Set([
  "GetObject",
  "HeadObject",
  "HeadBucket",
  "UsageSummary",
]);

function buildMeter(used: number, allowance: number) {
  const remaining = Math.max(allowance - used, 0);
  return {
    used,
    allowance,
    remaining,
    overAllowance: used > allowance,
  };
}

function buildStorageMeter(usedBytes: number, allowanceBytes: number) {
  const remainingBytes = Math.max(allowanceBytes - usedBytes, 0);
  return {
    usedBytes,
    allowanceBytes,
    remainingBytes,
    overAllowance: usedBytes > allowanceBytes,
  };
}

export function estimateNextBillUsd(meters: RawUsageMeters): number {
  const storageGb = Math.max(
    meters.storageBytes / 1024 ** 3 -
      R2_FREE_ALLOWANCE.storageBytes / 1024 ** 3,
    0,
  );
  const writesMillion = Math.max(
    meters.writesAndLists / 1_000_000 -
      R2_FREE_ALLOWANCE.writesAndLists / 1_000_000,
    0,
  );
  const readsMillion = Math.max(
    meters.readsAndChecks / 1_000_000 -
      R2_FREE_ALLOWANCE.readsAndChecks / 1_000_000,
    0,
  );

  return (
    storageGb * R2_PRICING.storagePerGbMonthUsd +
    writesMillion * R2_PRICING.writesPerMillionUsd +
    readsMillion * R2_PRICING.readsPerMillionUsd
  );
}

export async function getUsageMeters(
  accountId: string,
  accessToken: string,
): Promise<{ data: RawUsageMeters | null; error: string | null }> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(1);
  startDate.setUTCHours(0, 0, 0, 0);

  const query = `
    query R2Usage(
      $accountTag: String!
      $startDate: Time!
      $endDate: Time!
    ) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          r2StorageAdaptiveGroups(
            limit: 1
            filter: {
              datetime_geq: $startDate
              datetime_leq: $endDate
            }
            orderBy: [datetime_DESC]
          ) {
            max {
              payloadSize
              metadataSize
            }
            dimensions {
              datetime
            }
          }
          r2OperationsAdaptiveGroups(
            limit: 10000
            filter: {
              datetime_geq: $startDate
              datetime_leq: $endDate
            }
          ) {
            sum {
              requests
            }
            dimensions {
              actionType
            }
          }
        }
      }
    }
  `;

  const { data: response, error } = await tryCatch(
    fetch(CLOUDFLARE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          accountTag: accountId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      }),
    }),
  );

  if (error) {
    return { data: null, error: "Could not reach Cloudflare analytics" };
  }

  const { data: payload, error: parseError } = await tryCatch(
    response.json() as Promise<GraphQlResponse>,
  );

  if (parseError) {
    return {
      data: null,
      error: "Could not read Cloudflare analytics response",
    };
  }

  if (!response.ok || payload.errors?.length) {
    const message =
      payload.errors?.[0]?.message ??
      "Cloudflare analytics is unavailable for this account";
    return { data: null, error: message };
  }

  const account = payload.data?.viewer?.accounts?.[0];
  if (!account) {
    return { data: null, error: "No analytics data found for this account" };
  }

  const storageGroup = account.r2StorageAdaptiveGroups?.[0]?.max;
  const storageBytes =
    (storageGroup?.payloadSize ?? 0) + (storageGroup?.metadataSize ?? 0);

  let writesAndLists = 0;
  let readsAndChecks = 0;

  for (const group of account.r2OperationsAdaptiveGroups ?? []) {
    const actionType = group.dimensions?.actionType ?? "";
    const requests = group.sum?.requests ?? 0;

    if (CLASS_A_ACTIONS.has(actionType)) {
      writesAndLists += requests;
    } else if (CLASS_B_ACTIONS.has(actionType)) {
      readsAndChecks += requests;
    }
  }

  return {
    data: {
      writesAndLists,
      readsAndChecks,
      storageBytes,
    },
    error: null,
  };
}

export async function getCycleToDateCostUsd(
  accountId: string,
  accessToken: string,
): Promise<{ data: number | null; error: string | null }> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/billing/usage`;

  const { data: response, error } = await tryCatch(
    fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );

  if (error || !response.ok) {
    return { data: null, error: "Billing usage is unavailable" };
  }

  const { data: payload, error: parseError } = await tryCatch(
    response.json() as Promise<{
      result?: { totals?: { total?: number } };
    }>,
  );

  if (parseError) {
    return { data: null, error: "Could not read billing usage response" };
  }

  const total = payload.result?.totals?.total;
  if (typeof total !== "number") {
    return { data: null, error: null };
  }

  return { data: total, error: null };
}

export async function getAccountUsage({
  accountId,
  bucketName,
  accessToken,
}: {
  accountId: string;
  bucketName: string;
  accessToken: string | null | undefined;
}) {
  if (!accessToken) {
    return {
      error: "Reconnect with Cloudflare to refresh your access token.",
      errorCode: "no_token" as const,
      dashboardUrl: buildDashboardUrl(accountId, bucketName),
    };
  }

  const { data: meters, error: metersError } = await getUsageMeters(
    accountId,
    accessToken,
  );

  if (!meters) {
    const isScopeError =
      metersError?.toLowerCase().includes("scope") ||
      metersError?.toLowerCase().includes("permission");

    return {
      error:
        metersError ??
        "Usage data is unavailable. Try Refresh or reconnect your Cloudflare account.",
      errorCode: isScopeError
        ? ("missing_scopes" as const)
        : ("api_unavailable" as const),
      dashboardUrl: buildDashboardUrl(accountId, bucketName),
    };
  }

  const { data: cycleToDateUsd } = await getCycleToDateCostUsd(
    accountId,
    accessToken,
  );

  return {
    writesAndLists: buildMeter(
      meters.writesAndLists,
      R2_FREE_ALLOWANCE.writesAndLists,
    ),
    readsAndChecks: buildMeter(
      meters.readsAndChecks,
      R2_FREE_ALLOWANCE.readsAndChecks,
    ),
    storage: buildStorageMeter(
      meters.storageBytes,
      R2_FREE_ALLOWANCE.storageBytes,
    ),
    cost: {
      cycleToDateUsd,
      estimatedNextBillUsd: estimateNextBillUsd(meters),
      isEstimate: true as const,
    },
    dashboardUrl: buildDashboardUrl(accountId, bucketName),
    lastUpdated: new Date().toISOString(),
  };
}
