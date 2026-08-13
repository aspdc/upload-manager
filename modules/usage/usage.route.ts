import { Elysia } from "elysia";
import { getCloudflareAccessToken } from "@/lib/cloudflare-token";
import { getUserTarget } from "@/lib/target";
import { requireAuth } from "@/middleware/auth";
import { getAccountUsage } from "./usage.service";

export const usageRoutes = new Elysia({ prefix: "/usage" })
  .use(requireAuth)
  .get("/", async ({ user, request, status }) => {
    const target = await getUserTarget(user.id);

    if (!target) {
      return {
        error: "Choose an account and bucket before viewing usage.",
        errorCode: "no_target" as const,
      };
    }

    const { data: accessToken, error: tokenError } =
      await getCloudflareAccessToken(request.headers);

    if (tokenError) {
      return status(500, {
        error: "Failed to load Cloudflare credentials",
        errorCode: "api_unavailable" as const,
      });
    }

    const usage = await getAccountUsage({
      accountId: target.accountId,
      bucketName: target.bucketName,
      accessToken,
    });

    if (usage.error) {
      return usage;
    }

    return usage;
  });
