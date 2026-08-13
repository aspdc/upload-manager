import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";
import {
  CLOUDFLARE_OAUTH_DISCOVERY_URL,
  CLOUDFLARE_OAUTH_PROVIDER_ID,
} from "@/lib/constants";

const cloudflareScopes =
  env.CLOUDFLARE_OAUTH_SCOPES.split(/\s+/).filter(Boolean);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  emailAndPassword: { enabled: false },
  secret: env.BETTER_AUTH_SECRET,
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: CLOUDFLARE_OAUTH_PROVIDER_ID,
          discoveryUrl: CLOUDFLARE_OAUTH_DISCOVERY_URL,
          clientId: env.CLOUDFLARE_CLIENT_ID,
          clientSecret: env.CLOUDFLARE_CLIENT_SECRET,
          // Must match the OAuth client's registered redirect URL exactly.
          redirectURI: `${env.BETTER_AUTH_URL}/api/auth/oauth2/callback/cloudflare`,
          scopes: cloudflareScopes,
          pkce: true,
          // Match Cloudflare dashboard / docs: client_secret_basic
          authentication: "basic",
          mapProfileToUser: (profile) => {
            const email =
              typeof profile.email === "string"
                ? profile.email
                : `${String(profile.sub ?? "user")}@cloudflare.oauth`;
            const name =
              typeof profile.name === "string"
                ? profile.name
                : typeof profile.preferred_username === "string"
                  ? profile.preferred_username
                  : email;

            return {
              name,
              email,
              emailVerified: true,
            };
          },
        },
      ],
    }),
  ],
});
