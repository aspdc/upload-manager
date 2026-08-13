import { buildCopyKey } from "./upload.schema";

export async function findAvailableCopyKey({
  originalKey,
  exists,
  reservedKeys,
}: {
  originalKey: string;
  exists: (key: string) => Promise<boolean>;
  reservedKeys?: ReadonlySet<string>;
}): Promise<string> {
  const taken = reservedKeys ?? new Set<string>();
  let copyIndex = 1;

  while (copyIndex < 10_000) {
    const candidate = buildCopyKey(originalKey, copyIndex);
    if (!taken.has(candidate)) {
      const keyExists = await exists(candidate);
      if (!keyExists) {
        return candidate;
      }
    }
    copyIndex += 1;
  }

  throw new Error(`Could not find an available copy name for ${originalKey}`);
}
