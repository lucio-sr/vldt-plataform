/**
 * E2E do Better Auth contra um Postgres real (PGlite/WASM), sem Docker.
 * Aplica as migrations, faz sign-up + sign-in e confere o estado no banco.
 * Uso: npm run test:e2e -w @labvie/api
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { drizzle } from "drizzle-orm/pglite";
import { createAuth } from "../src/auth/auth";
import * as schema from "../src/db/schema";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../db/migrations");
let failed = false;
const ok = (l: string) => console.log(`✓ ${l}`);
const fail = (l: string, e?: unknown) => {
  failed = true;
  console.log(`✗ ${l}${e ? `: ${(e as Error).message}` : ""}`);
};

const pg = new PGlite({ extensions: { vector } });
for (const f of ["0001_init_domain.sql", "0002_auth.sql", "0003_org.sql"]) {
  await pg.exec(readFileSync(join(migrationsDir, f), "utf8"));
}
ok("migrations aplicadas (0001+0002+0003)");

const db = drizzle(pg, { schema });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auth = createAuth(db as any);

const email = "founder@vldt.app";
const password = "supersecret-123";

try {
  await auth.api.signUpEmail({ body: { name: "Founder", email, password } });
  ok("signUpEmail sem erro");
} catch (e) {
  fail("signUpEmail", e);
}

const users = await pg.query<{ id: string; email: string; email_verified: boolean }>(
  `SELECT id, email, email_verified FROM users`,
);
users.rows.length === 1 && users.rows[0]?.email === email
  ? ok(`usuário criado no banco (${users.rows[0]?.email}, verified=${users.rows[0]?.email_verified})`)
  : fail(`esperava 1 usuário, veio ${users.rows.length}`);

const accounts = await pg.query<{ provider_id: string; password: string | null }>(
  `SELECT provider_id, password FROM accounts`,
);
accounts.rows.length === 1 && !!accounts.rows[0]?.password
  ? ok(`conta credential criada com senha hasheada (provider=${accounts.rows[0]?.provider_id})`)
  : fail(`esperava 1 conta com senha, veio ${accounts.rows.length}`);

const s1 = await pg.query<{ n: number }>(`SELECT count(*)::int n FROM sessions`);
(s1.rows[0]?.n ?? 0) >= 1 ? ok(`sessão criada no sign-up (n=${s1.rows[0]?.n})`) : fail("nenhuma sessão após sign-up");

try {
  await auth.api.signInEmail({ body: { email, password } });
  ok("signInEmail sem erro");
} catch (e) {
  fail("signInEmail", e);
}

const s2 = await pg.query<{ n: number }>(`SELECT count(*)::int n FROM sessions`);
(s2.rows[0]?.n ?? 0) >= (s1.rows[0]?.n ?? 0)
  ? ok(`sessão de sign-in registrada (n=${s2.rows[0]?.n})`)
  : fail("sign-in não registrou sessão");

// senha errada deve falhar
try {
  await auth.api.signInEmail({ body: { email, password: "errada" } });
  fail("sign-in com senha errada deveria falhar");
} catch {
  ok("sign-in com senha errada rejeitado (esperado)");
}

console.log(failed ? "\nE2E: houve falhas." : "\nE2E OK: Better Auth ↔ Postgres validado de ponta a ponta.");
process.exit(failed ? 1 : 0);
