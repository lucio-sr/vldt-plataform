// Testa as migrations contra um Postgres real em WASM (PGlite) — sem Docker, sem root.
// Aplica db/migrations/*.sql em ordem e roda asserções de domínio + pgvector.
// Uso: npm run db:test
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";

const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
const db = new PGlite({ extensions: { vector } });
const ok = (l) => console.log(`✓ ${l}`);
const fail = (l, e) => { console.log(`✗ ${l}: ${e.message}`); process.exitCode = 1; };

// aplica todas as migrations em ordem
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  try { await db.exec(readFileSync(join(dir, file), "utf8")); ok(`aplicada ${file}`); }
  catch (e) { fail(`aplicar ${file}`, e); }
}

const tables = (await db.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`)).rows[0].n;
const enums = (await db.query(`SELECT count(*)::int n FROM pg_type WHERE typtype='e'`)).rows[0].n;
console.log(`  ${tables} tabelas, ${enums} enums`);

try {
  const userId = (await db.query(`INSERT INTO users (name,email) VALUES ('t','t@x.io') RETURNING id`)).rows[0].id;
  const projectId = (await db.query(`INSERT INTO projects (name,owner_id) VALUES ('p',$1) RETURNING id`, [userId])).rows[0].id;
  for (const [i, type] of ["setup","ambiente","estrategia","interacoes","operacoes","unificacao","sintese"].entries())
    await db.query(`INSERT INTO pillars (project_id,type,position) VALUES ($1,$2,$3)`, [projectId, type, i]);
  const n = (await db.query(`SELECT count(*)::int n FROM pillars WHERE project_id=$1`, [projectId])).rows[0].n;
  n === 7 ? ok("7 etapas semeadas") : fail("etapas", new Error(`esperava 7, veio ${n}`));
} catch (e) { fail("fluxo de dominio", e); }

try { await db.query(`INSERT INTO pillars (project_id,type) VALUES (gen_random_uuid(),'invalido')`); fail("enum", new Error("aceitou invalido")); }
catch { ok("enum invalido rejeitado"); }

try {
  const v = (s) => "[" + Array.from({ length: 1536 }, (_, i) => Math.sin(s + i).toFixed(4)).join(",") + "]";
  await db.query(`INSERT INTO rag_chunks (source_type,content,embedding) VALUES ('caso','a',$1::vector),('paper','b',$2::vector)`, [v(0), v(50)]);
  const near = (await db.query(`SELECT content FROM rag_chunks ORDER BY embedding <=> $1::vector LIMIT 1`, [v(0.01)])).rows[0].content;
  near === "a" ? ok("pgvector busca cosine OK") : fail("pgvector", new Error(`vizinho inesperado: ${near}`));
} catch (e) { fail("pgvector", e); }

console.log(process.exitCode ? "\nFALHAS encontradas." : "\nMigrations OK (Postgres real via PGlite).");
process.exit(process.exitCode ?? 0);
