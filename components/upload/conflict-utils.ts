import { buildCopyKey } from "@/modules/upload";
import { checkUploadConflicts } from "@/lib/upload-api";

export async function findAvailableCopyKey({
  target,
  originalKey,
  reservedKeys,
}: {
  target: {
    accountId: string;
    bucketName: string;
  };
  originalKey: string;
  reservedKeys?: ReadonlySet<string>;
}): Promise<string> {
  const taken = reservedKeys ?? new Set<string>();
  let copyIndex = 1;

  while (copyIndex < 10_000) {
    const candidate = buildCopyKey(originalKey, copyIndex);
    if (taken.has(candidate)) {
      copyIndex += 1;
      continue;
    }

    const result = await checkUploadConflicts({
      accountId: target.accountId,
      bucketName: target.bucketName,
      keys: [candidate],
    });

    if ("error" in result) {
      throw new Error(result.error);
    }

    if (!result.conflicts.includes(candidate)) {
      return candidate;
    }

    copyIndex += 1;
  }

  throw new Error(`Could not find an available copy name for ${originalKey}`);
}
