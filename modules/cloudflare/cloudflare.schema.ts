import { z } from "zod";

export const rawUsageMetersSchema = z.object({
  writesAndLists: z.number().nonnegative(),
  readsAndChecks: z.number().nonnegative(),
  storageBytes: z.number().nonnegative(),
});

export type RawUsageMeters = z.infer<typeof rawUsageMetersSchema>;
