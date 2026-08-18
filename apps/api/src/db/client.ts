import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

/** Token de injeção do Drizzle (DI explícita — esbuild/tsx-friendly). */
export const DRIZZLE = Symbol("DRIZZLE");

export type Database = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
}
