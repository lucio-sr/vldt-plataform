/**
 * E2E da ingestão de entrevista (PRD §10.3) contra Postgres real (PGlite):
 * transcrição → User Research (Mock) → anotações + evidências tipo entrevista.
 * Uso: npm run test:interview -w @labvie/api
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { MockProvider, runUserResearch } from "@labvie/agents";
import { type QueryFn, persistInterviewAnalysis } from "../src/pillars/persistence";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../../db/migrations");
let failed = false;
const ok = (l: string) => console.log(`✓ ${l}`);
const fail = (l: string, e?: unknown) => {
  failed = true;
  console.log(`✗ ${l}${e ? `: ${(e as Error).message}` : ""}`);
};

const pg = new PGlite({ extensions: { vector } });
await pg.exec(readFileSync(join(migrationsDir, "0001_init_domain.sql"), "utf8"));
const q: QueryFn = (sql, params) => pg.query(sql, params ?? []);

const userId = (await pg.query<{ id: string }>(`INSERT INTO users (name,email) VALUES ('A','a@x.io') RETURNING id`))
  .rows[0]!.id;
const projectId = (
  await pg.query<{ id: string }>(`INSERT INTO projects (name,owner_id) VALUES ('COBRA',$1) RETURNING id`, [userId])
).rows[0]!.id;
const pillarId = (
  await pg.query<{ id: string }>(
    `INSERT INTO pillars (project_id,type,position) VALUES ($1,'interacoes',3) RETURNING id`,
    [projectId],
  )
).rows[0]!.id;
const interviewId = (
  await pg.query<{ id: string }>(
    `INSERT INTO interviews (project_id, persona, transcript, consent, status)
     VALUES ($1,'secretária de educação','as crianças chegam ao 5º ano sem ler',true,'processando') RETURNING id`,
    [projectId],
  )
).rows[0]!.id;
ok("seed: projeto + etapa interações + entrevista (consentida)");

const { output, run } = await runUserResearch(new MockProvider(), {
  persona: "secretária de educação",
  transcript: "as crianças chegam ao 5º ano sem ler; a verba é carimbada para pessoal.",
});
await persistInterviewAnalysis(q, { interviewId, projectId, pillarId }, output, run);

const iv = (
  await pg.query<{ status: string; ai_annotations: unknown }>(
    `SELECT status, ai_annotations FROM interviews WHERE id=$1`,
    [interviewId],
  )
).rows[0]!;
iv.status === "analisada" ? ok("entrevista marcada como analisada") : fail(`status: ${iv.status}`);
const ann = typeof iv.ai_annotations === "string" ? JSON.parse(iv.ai_annotations) : (iv.ai_annotations as { objections?: unknown[] });
Array.isArray(ann.objections) && ann.objections.length > 0
  ? ok("anotações de IA gravadas (objeções/voz-do-cliente)")
  : fail("anotações vazias");

const ev = (
  await pg.query<{ n: number }>(
    `SELECT count(*)::int n FROM evidences WHERE interview_id=$1 AND type='entrevista'`,
    [interviewId],
  )
).rows[0]!.n;
ev === output.evidences.length && ev > 0
  ? ok(`${ev} evidência(s) tipo entrevista vinculadas`)
  : fail(`evidências: esperava ${output.evidences.length}, veio ${ev}`);

const ar = (await pg.query<{ n: number }>(`SELECT count(*)::int n FROM agent_runs WHERE agent='user_research'`)).rows[0]!.n;
ar === 1 ? ok("agent_run do user_research (telemetria)") : fail(`agent_runs: ${ar}`);

console.log(failed ? "\nINTERVIEW E2E: houve falhas." : "\nINTERVIEW E2E OK: transcrição → análise → evidências (Postgres real).");
process.exit(failed ? 1 : 0);
