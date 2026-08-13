import { Elysia } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { uploadBatch, uploadItem } from "@/db/schema";
import { getUserTarget } from "@/lib/target";
import { requireAuth } from "@/middleware/auth";
import { tryCatch } from "@/lib/try-catch";
import { buildCopyPayload, createHistoryBatchSchema } from "./history.schema";

function createId() {
  return crypto.randomUUID();
}

export const historyRoutes = new Elysia({ prefix: "/history" })
  .use(requireAuth)
  .get("/", async ({ user, status }) => {
    const target = await getUserTarget(user.id);

    if (!target) {
      return { batches: [] };
    }

    const { data: batches, error } = await tryCatch(
      db.query.uploadBatch.findMany({
        where: and(
          eq(uploadBatch.userId, user.id),
          eq(uploadBatch.accountId, target.accountId),
          eq(uploadBatch.bucketName, target.bucketName),
        ),
        orderBy: [desc(uploadBatch.createdAt)],
        with: {
          items: {
            orderBy: (items, { asc }) => [asc(items.sortOrder)],
          },
        },
      }),
    );

    if (error) {
      return status(500, {
        error: "Failed to load upload history",
        batches: [],
      });
    }

    return {
      batches: batches.map((batch) => {
        const urls = batch.items.map((item) => item.publicUrl);
        return {
          id: batch.id,
          createdAt: batch.createdAt.toISOString(),
          itemCount: batch.items.length,
          copyPayload: buildCopyPayload(urls),
          items: batch.items.map((item) => ({
            key: item.objectKey,
            publicUrl: item.publicUrl,
          })),
        };
      }),
    };
  })
  .post("/", async ({ user, body, status }) => {
    const parsed = createHistoryBatchSchema.safeParse(body);
    if (!parsed.success) {
      return status(400, {
        error: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      });
    }

    const { accountId, bucketName, publicBaseUrl, items } = parsed.data;
    const batchId = createId();

    const { error } = await tryCatch(
      db.transaction(async (tx) => {
        await tx.insert(uploadBatch).values({
          id: batchId,
          userId: user.id,
          accountId,
          bucketName,
          publicBaseUrl,
        });

        await tx.insert(uploadItem).values(
          items.map((item, index) => ({
            id: createId(),
            batchId,
            objectKey: item.key,
            publicUrl: item.publicUrl,
            sortOrder: index,
          })),
        );
      }),
    );

    if (error) {
      return status(500, { error: "Failed to save upload history" });
    }

    const urls = items.map((item) => item.publicUrl);

    return {
      batch: {
        id: batchId,
        createdAt: new Date().toISOString(),
        itemCount: items.length,
        copyPayload: buildCopyPayload(urls),
        items,
      },
    };
  });
