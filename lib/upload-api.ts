"use client";

import type {
  ConflictCheckInput,
  UploadResult,
  UploadTarget,
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

async function parseJson<T>(response: Response): Promise<T | ApiError> {
  const payload = (await response.json()) as T | ApiError;
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Request failed";
    return { error: message };
  }
  return payload;
}

export async function checkUploadConflicts(
  input: ConflictCheckInput,
): Promise<{ conflicts: string[] } | ApiError> {
  const response = await fetch(`${getBaseUrl()}/api/upload/check-conflicts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{ conflicts: string[] }>(response);
}

export async function uploadFiles({
  target,
  files,
  keys,
}: {
  target: UploadTarget;
  files: File[];
  keys: string[];
}): Promise<UploadResult | ApiError> {
  const formData = new FormData();
  formData.append("accountId", target.accountId);
  formData.append("bucketName", target.bucketName);
  formData.append("publicBaseUrl", target.publicBaseUrl);
  formData.append("keys", JSON.stringify(keys));

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${getBaseUrl()}/api/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  return parseJson<UploadResult>(response);
}
