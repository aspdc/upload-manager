import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/env";

export const db = drizzle(new Pool({ connectionString: env.DATABASE_URL }), {
  schema,
});
