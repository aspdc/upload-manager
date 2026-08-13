import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { CLOUDFLARE_OAUTH_PROVIDER_ID } from "@/lib/constants";
import { tryCatch } from "@/lib/try-catch";

export async function getCloudflareAccessToken(requestHeaders?: Headers) {
  const hdrs = requestHeaders ?? (await headers());

  const { data, error } = await tryCatch(
    auth.api.getAccessToken({
      headers: hdrs,
      body: {
        providerId: CLOUDFLARE_OAUTH_PROVIDER_ID,
      },
    }),
  );

  if (error || !data?.accessToken) {
    return {
      data: null,
      error: error ?? new Error("Missing Cloudflare access token"),
    };
  }

  return { data: data.accessToken, error: null };
}
