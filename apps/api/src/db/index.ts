import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Env = {
  DB: D1Database;
  KV: KVNamespace;
  BETTER_AUTH_SECRET: string;
  CORS_ORIGIN: string;
  GEMINI_API_KEY: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
};

export function getDb(env: Env) {
  return drizzle(env.DB, { schema });
}

export type DbClient = ReturnType<typeof getDb>;
