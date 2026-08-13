import { treaty } from "@elysia/eden";
import type { App } from "@/app/api/[[...slugs]]/route";
import { env } from "@/env";

export const api = treaty<App>(env.BETTER_AUTH_URL);
