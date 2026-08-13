import { Elysia } from "elysia";
import { authRoutes } from "@/modules/auth/auth.route";
import { historyRoutes } from "@/modules/history/history.route";
import { targetRoutes } from "@/modules/target/target.route";
import { uploadRoutes } from "@/modules/upload/upload.route";
import { usageRoutes } from "@/modules/usage/usage.route";

const app = new Elysia({ prefix: "/api" })
  .use(authRoutes)
  .use(targetRoutes)
  .use(uploadRoutes)
  .use(historyRoutes)
  .use(usageRoutes)
  .get("/health", () => ({ status: "ok" }));

export type App = typeof app;

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
