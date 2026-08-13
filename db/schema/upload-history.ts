import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const uploadBatch = pgTable(
  "upload_batch",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    bucketName: text("bucket_name").notNull(),
    publicBaseUrl: text("public_base_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("upload_batch_user_account_bucket_idx").on(
      table.userId,
      table.accountId,
      table.bucketName,
    ),
  ],
);

export const uploadItem = pgTable(
  "upload_item",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id")
      .notNull()
      .references(() => uploadBatch.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    publicUrl: text("public_url").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("upload_item_batch_idx").on(table.batchId)],
);

export const uploadBatchRelations = relations(uploadBatch, ({ many }) => ({
  items: many(uploadItem),
}));

export const uploadItemRelations = relations(uploadItem, ({ one }) => ({
  batch: one(uploadBatch, {
    fields: [uploadItem.batchId],
    references: [uploadBatch.id],
  }),
}));
