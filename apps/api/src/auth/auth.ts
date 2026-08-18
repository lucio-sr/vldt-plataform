import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { createDb } from "../db/client";
import * as schema from "../db/schema";

/**
 * Better Auth (ADR 0002 D3). Identidade unificada ao `users` do domínio:
 * ids uuid gerados pelo Postgres (generateId:false), tabelas plurais (usePlural).
 * Plugin `organization` habilita o modo assistido (consultor↔projetos — PRD §8).
 *
 * Fábrica `createAuth(db)` para permitir injetar qualquer driver Drizzle
 * (node-postgres em prod; PGlite nos testes e2e).
 */
type AuthDb = Parameters<typeof drizzleAdapter>[0];

export function createAuth(db: AuthDb) {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-trocar-em-prod",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    basePath: "/api/auth",
    trustedOrigins: [process.env.WEB_ORIGIN ?? "http://localhost:5173"],
    database: drizzleAdapter(db, {
      provider: "pg",
      usePlural: true,
      schema,
    }),
    emailAndPassword: { enabled: true },
    advanced: {
      database: {
        generateId: false, // Postgres gera os uuid (gen_random_uuid)
      },
    },
    plugins: [organization()],
  });
}

const db = createDb(process.env.DATABASE_URL ?? "postgresql://localhost:5432/labvie");

export const auth = createAuth(db);
export type Auth = typeof auth;
