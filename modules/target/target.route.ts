import { Elysia, t } from "elysia";
import {
  listBucketsWithPublicDevUrl,
  listCloudflareAccounts,
} from "@/lib/cloudflare-api";
import { getCloudflareAccessToken } from "@/lib/cloudflare-token";
import { clearUserTarget, getUserTarget, saveUserTarget } from "@/lib/target";
import { authMiddleware } from "@/middleware/auth";
import { selectTargetSchema } from "./target.schema";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const targetRoutes = new Elysia({ prefix: "/target" })
  .use(authMiddleware)
  .get("/", async ({ user }) => {
    if (!user) {
      return unauthorized();
    }

    const target = await getUserTarget(user.id);

    return { target };
  })
  .put(
    "/",
    async ({ user, body, status }) => {
      if (!user) {
        return unauthorized();
      }

      const parsed = selectTargetSchema.safeParse(body);
      if (!parsed.success) {
        return status(400, {
          error: parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", "),
        });
      }

      const { data: target, error } = await saveUserTarget(
        user.id,
        parsed.data,
      );

      if (error || !target) {
        return status(500, {
          error: error?.message ?? "Failed to save upload target",
        });
      }

      return { target };
    },
    {
      body: t.Object({
        accountId: t.String(),
        bucketName: t.String(),
        publicBaseUrl: t.String(),
      }),
    },
  )
  .get("/accounts", async ({ user, request }) => {
    if (!user) {
      return unauthorized();
    }

    const { data: accessToken, error: tokenError } =
      await getCloudflareAccessToken(request.headers);

    if (tokenError || !accessToken) {
      return new Response(
        JSON.stringify({
          error: tokenError?.message ?? "Missing Cloudflare access token",
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await listCloudflareAccounts(accessToken);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return { accounts: data };
  })
  .get(
    "/accounts/:accountId/buckets",
    async ({ user, request, params: { accountId } }) => {
      if (!user) {
        return unauthorized();
      }

      const { data: accessToken, error: tokenError } =
        await getCloudflareAccessToken(request.headers);

      if (tokenError || !accessToken) {
        return new Response(
          JSON.stringify({
            error: tokenError?.message ?? "Missing Cloudflare access token",
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { data, error } = await listBucketsWithPublicDevUrl(
        accessToken,
        accountId,
      );

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }

      return { buckets: data };
    },
    {
      params: t.Object({
        accountId: t.String(),
      }),
    },
  )
  .post(
    "/select",
    async ({ user, request, body }) => {
      if (!user) {
        return unauthorized();
      }

      const parsed = selectTargetSchema.safeParse(body);

      if (!parsed.success) {
        const issues = parsed.error.issues
          .map((issue) => issue.message)
          .join(", ");
        return new Response(JSON.stringify({ error: issues }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { data: accessToken, error: tokenError } =
        await getCloudflareAccessToken(request.headers);

      if (tokenError || !accessToken) {
        return new Response(
          JSON.stringify({
            error: tokenError?.message ?? "Missing Cloudflare access token",
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { data: buckets, error: bucketsError } =
        await listBucketsWithPublicDevUrl(accessToken, parsed.data.accountId);

      if (bucketsError || !buckets) {
        return new Response(
          JSON.stringify({
            error: bucketsError?.message ?? "Failed to verify bucket",
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const selectedBucket = buckets.find(
        (bucket) => bucket.name === parsed.data.bucketName,
      );

      if (
        !selectedBucket ||
        selectedBucket.publicBaseUrl !== parsed.data.publicBaseUrl
      ) {
        return new Response(
          JSON.stringify({
            error: "Selected bucket is not publicly available on r2.dev",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const { data: target, error: saveError } = await saveUserTarget(user.id, {
        accountId: parsed.data.accountId,
        bucketName: parsed.data.bucketName,
        publicBaseUrl: parsed.data.publicBaseUrl,
      });

      if (saveError || !target) {
        return new Response(
          JSON.stringify({
            error: saveError?.message ?? "Failed to save selection",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return { target };
    },
    {
      body: t.Object({
        accountId: t.String(),
        bucketName: t.String(),
        publicBaseUrl: t.String(),
      }),
    },
  )
  .delete("/", async ({ user }) => {
    if (!user) {
      return unauthorized();
    }

    const { error } = await clearUserTarget(user.id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message ?? "Failed to clear selection" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return { cleared: true };
  });
