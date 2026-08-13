"use client";

import { buildCopyPayload } from "@/modules/upload";
import type {
  ConflictCheckInput,
  UploadResult,
  UploadTarget,
  UploadedItem,
} from "@/modules/upload";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

type ApiError = {
  error: string;
};

function statusErrorMessage(status: number, fallback?: string): string {
  if (status === 413) {
    return "File is too large for the server to accept (over ~4.5 MB total per request).";
  }
  if (status === 401) {
    return "You are signed out or Cloudflare is not connected. Sign in again.";
  }
  if (status === 403) {
    return "You do not have permission to upload.";
  }
  if (status >= 500) {
    return fallback ?? "Upload failed on the server. Try again.";
  }
  return fallback ?? `Request failed (${status})`;
}

async function parseJson<T>(response: Response): Promise<T | ApiError> {
  const contentType = response.headers.get("content-type") ?? "";
  const canParseJson = contentType.includes("application/json");

  if (!canParseJson) {
    if (!response.ok) {
      return { error: statusErrorMessage(response.status) };
    }
    return { error: "Unexpected response from server" };
  }

  const { data: payload, error: parseError } = await (async () => {
    try {
      return { data: (await response.json()) as T | ApiError, error: null };
    } catch {
      return { data: null, error: true as const };
    }
  })();

  if (parseError || payload === null) {
    return {
      error: response.ok
        ? "Unexpected response from server"
        : statusErrorMessage(response.status),
    };
  }

  if (!response.ok) {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "items" in payload &&
      Array.isArray((payload as { items?: unknown }).items)
    ) {
      return payload as T;
    }
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : statusErrorMessage(response.status);
    return { error: message };
  }

  return payload;
}

export async function checkUploadConflicts(
  input: ConflictCheckInput,
): Promise<{ conflicts: string[] } | ApiError> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/upload/check-conflicts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    });

    return parseJson<{ conflicts: string[] }>(response);
  } catch {
    return { error: "Could not reach the server to check file names" };
  }
}

async function uploadSingleFile({
  target,
  file,
  key,
  batchName,
}: {
  target: UploadTarget;
  file: File;
  key: string;
  batchName: string;
}): Promise<UploadResult | ApiError> {
  const formData = new FormData();
  formData.append("accountId", target.accountId);
  formData.append("bucketName", target.bucketName);
  formData.append("publicBaseUrl", target.publicBaseUrl);
  formData.append("batchName", batchName);
  formData.append("saveHistory", "false");
  formData.append("keys", JSON.stringify([key]));
  formData.append("files", file);

  try {
    const response = await fetch(`${getBaseUrl()}/api/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    return parseJson<UploadResult>(response);
  } catch {
    return { error: `${key}: could not reach the server` };
  }
}

async function saveUploadHistoryBatch({
  target,
  batchName,
  items,
}: {
  target: UploadTarget;
  batchName: string;
  items: Array<{ key: string; publicUrl: string }>;
}): Promise<{ ok: true } | ApiError> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        accountId: target.accountId,
        bucketName: target.bucketName,
        publicBaseUrl: target.publicBaseUrl,
        name: batchName,
        items,
      }),
    });

    const payload = await parseJson<{ batch?: unknown }>(response);
    if ("error" in payload) {
      return { error: payload.error };
    }
    return { ok: true };
  } catch {
    return { error: "Could not save upload history" };
  }
}

/**
 * Uploads one file per request so the Vercel body stays under ~4.5MB,
 * then writes a single history batch for everything that succeeded.
 */
export async function uploadFiles({
  target,
  files,
  keys,
  batchName,
  onFileComplete,
}: {
  target: UploadTarget;
  files: File[];
  keys: string[];
  batchName: string;
  onFileComplete?: (input: {
    key: string;
    item: UploadedItem | null;
    error: string | null;
  }) => void;
}): Promise<UploadResult | ApiError> {
  const uploadedItems: UploadedItem[] = [];
  let uploadError: string | null = null;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const key = keys[index];
    if (!file || !key) {
      uploadError = "Upload file/key mismatch";
      break;
    }

    const result = await uploadSingleFile({
      target,
      file,
      key,
      batchName,
    });

    if ("error" in result && !("items" in result)) {
      uploadError = result.error;
      onFileComplete?.({ key, item: null, error: result.error });
      break;
    }

    const uploaded = result.items[0];
    if (!uploaded) {
      uploadError = `${key}: upload failed`;
      onFileComplete?.({ key, item: null, error: uploadError });
      break;
    }

    uploadedItems.push(uploaded);
    onFileComplete?.({ key, item: uploaded, error: null });

    if (result.error) {
      uploadError = result.error;
      break;
    }
  }

  if (uploadedItems.length === 0) {
    return { error: uploadError ?? "Upload failed" };
  }

  const copyPayload = buildCopyPayload(
    uploadedItems.map((item) => item.publicUrl),
  );

  const historyResult = await saveUploadHistoryBatch({
    target,
    batchName,
    items: uploadedItems.map((item) => ({
      key: item.key,
      publicUrl: item.publicUrl,
    })),
  });

  if ("error" in historyResult) {
    return {
      items: uploadedItems,
      copyPayload,
      batchName,
      historySaved: false,
      error:
        uploadError ??
        "Files uploaded, but history could not be saved. Try again later.",
    };
  }

  return {
    items: uploadedItems,
    copyPayload,
    batchName,
    historySaved: true,
    error: uploadError ?? undefined,
  };
}
