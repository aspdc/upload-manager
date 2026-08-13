import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";
import { CLOUDFLARE_OAUTH_PROVIDER_ID } from "@/lib/constants";
import { tryCatch } from "./try-catch";

const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});

export async function signInWithCloudflare() {
  return tryCatch(
    authClient.signIn.oauth2({
      providerId: CLOUDFLARE_OAUTH_PROVIDER_ID,
      callbackURL: "/select-target",
    }),
  );
}

export async function signOut() {
  return tryCatch(authClient.signOut());
}

export async function clearTarget() {
  return tryCatch(
    fetch("/api/target", {
      method: "DELETE",
      credentials: "include",
    }).then(async (response) => {
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to clear target");
      }

      return response.json();
    }),
  );
}

export function useSession() {
  return authClient.useSession();
}
