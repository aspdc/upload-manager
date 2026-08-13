import { Elysia, t } from "elysia";
import { auth } from "@/lib/auth";
import { authMiddleware } from "@/middleware/auth";

export const authRoutes = new Elysia()
  .use(authMiddleware)
  .all("/auth/*", ({ request }) => {
    const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"];
    if (BETTER_AUTH_ACCEPT_METHODS.includes(request.method)) {
      return auth.handler(request);
    }
    return new Response("Method Not Allowed", { status: 405 });
  })
  .get(
    "/users/:id",
    ({ params: { id }, user }) => ({
      id,
      name: user?.name ?? "Unknown",
      email: user?.email ?? "unknown@example.com",
    }),
    {
      params: t.Object({
        id: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        name: t.String(),
        email: t.String(),
      }),
    },
  );
