"use client";

import { treaty } from "@elysia/eden";
import type { App } from "@/app/api/[[...slugs]]/route";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export const apiClient = treaty<App>(getBaseUrl(), {
  fetch: {
    credentials: "include",
  },
});

export function isJsonBody<T extends Record<string, unknown>>(
  value: unknown,
): value is T {
  return (
    typeof value === "object" && value !== null && !(value instanceof Response)
  );
}
