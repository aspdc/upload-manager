import { z } from "zod";

export const selectTargetSchema = z.object({
  accountId: z.string().min(1),
  bucketName: z.string().min(1),
  publicBaseUrl: z.url(),
});

export const cloudflareAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const publicBucketSchema = z.object({
  name: z.string(),
  publicBaseUrl: z.url(),
});

export const userTargetSchema = z.object({
  accountId: z.string(),
  bucketName: z.string(),
  publicBaseUrl: z.url(),
});

export type SelectTargetInput = z.infer<typeof selectTargetSchema>;
export type CloudflareAccount = z.infer<typeof cloudflareAccountSchema>;
export type PublicBucket = z.infer<typeof publicBucketSchema>;
export type UserTarget = z.infer<typeof userTargetSchema>;
