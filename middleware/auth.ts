import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { tryCatch } from "@/lib/try-catch";

export const authMiddleware = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({ request }) => {
    const { data: session } = await tryCatch(
      auth.api.getSession({ headers: request.headers }),
    );

    if (!session) {
      return {
        user: null,
        session: null,
      };
    }

    return {
      user: session.user,
      session: session.session,
    };
  },
);

export const requireAuth = new Elysia({ name: "require-auth" }).derive(
  { as: "scoped" },
  async ({ request, status }) => {
    const { data: session } = await tryCatch(
      auth.api.getSession({ headers: request.headers }),
    );

    if (!session) {
      return status(401, { error: "Unauthorized" });
    }

    return {
      user: session.user,
      session: session.session,
    };
  },
);
