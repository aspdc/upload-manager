import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userTarget } from "@/db/schema";
import { tryCatch } from "@/lib/try-catch";

export type UserTarget = {
  accountId: string;
  bucketName: string;
  publicBaseUrl: string;
};

export async function getUserTarget(
  userId: string,
): Promise<UserTarget | null> {
  const { data, error } = await tryCatch(
    db.query.userTarget.findFirst({
      where: eq(userTarget.userId, userId),
    }),
  );

  if (error || !data) {
    return null;
  }

  return {
    accountId: data.accountId,
    bucketName: data.bucketName,
    publicBaseUrl: data.publicBaseUrl,
  };
}

export async function saveUserTarget(
  userId: string,
  target: UserTarget,
): Promise<{ data: UserTarget | null; error: Error | null }> {
  const { error } = await tryCatch(
    db
      .insert(userTarget)
      .values({
        userId,
        accountId: target.accountId,
        bucketName: target.bucketName,
        publicBaseUrl: target.publicBaseUrl,
      })
      .onConflictDoUpdate({
        target: userTarget.userId,
        set: {
          accountId: target.accountId,
          bucketName: target.bucketName,
          publicBaseUrl: target.publicBaseUrl,
          updatedAt: new Date(),
        },
      }),
  );

  if (error) {
    return { data: null, error };
  }

  return { data: target, error: null };
}

export async function clearUserTarget(
  userId: string,
): Promise<{ data: boolean; error: Error | null }> {
  const { error } = await tryCatch(
    db.delete(userTarget).where(eq(userTarget.userId, userId)),
  );

  if (error) {
    return { data: false, error };
  }

  return { data: true, error: null };
}
