import { z } from "zod";

export const usageMeterSchema = z.object({
  used: z.number(),
  allowance: z.number(),
  remaining: z.number(),
  overAllowance: z.boolean(),
});

export const usageResponseSchema = z.object({
  writesAndLists: usageMeterSchema.optional(),
  readsAndChecks: usageMeterSchema.optional(),
  storage: z
    .object({
      usedBytes: z.number(),
      allowanceBytes: z.number(),
      remainingBytes: z.number(),
      overAllowance: z.boolean(),
    })
    .optional(),
  cost: z
    .object({
      cycleToDateUsd: z.number().nullable(),
      estimatedNextBillUsd: z.number(),
      isEstimate: z.literal(true),
    })
    .optional(),
  dashboardUrl: z.string().optional(),
  lastUpdated: z.string().optional(),
  error: z.string().optional(),
  errorCode: z
    .enum(["no_target", "no_token", "api_unavailable", "missing_scopes"])
    .optional(),
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;
export type UsageMeter = z.infer<typeof usageMeterSchema>;

export type RawUsageMeters = {
  writesAndLists: number;
  readsAndChecks: number;
  storageBytes: number;
};
