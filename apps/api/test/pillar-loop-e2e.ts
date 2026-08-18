/**
 * E2E do loop completo da etapa (PRD §10.2) contra Postgres real (PGlite):
 * agentes (RAG + Mock) → persistência (evidências/síntese/etapa) → gate → versão da tese com diff.
 * Uso: npm run test:loop -w @labvie/api
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import {
  MockEmbedder,
  MockProvider,
  type RetrievedChunk,
  pgvectorRetriever,
  runPillar,
  toVectorLiteral,
} from "@labvie/agents";
import { commitGateDecision, persistPillarResult, type QueryFn } from "../src/pillars/persistence";

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

// seed: usuário, projeto, etapas, corpus
const userId = (await pg.query<{ id: string }>(`INSERT INTO users (name,email) VALUES ('A','a@x.io') RETURNING id`))
  .rows[0]!.id;
const projectId = (
  await pg.query<{ id: string }>(`INSERT INTO projects (name,owner_id) VALUES ('COBRA',$1) RETURNING id`, [userId])
).rows[0]!.id;
for (const [i, type] of ["setup", "ambiente", "estrategia", "interacoes", "operacoes", "unificacao", "sintese"].entries())
  await pg.query(`INSERT INTO pillars (project_id,type,position) VALUES ($1,$2,$3)`, [projectId, type, i]);

const embedder = new MockEmbedder();
for (const content of [
  "SAEB pressiona gestores por alfabetização.",
  "FUNDEB carimba verba para pessoal.",
  "Compra B2G municipal é longa.",
])
  await pg.query(`INSERT INTO rag_chunks (project_id,source_type,content,embedding) VALUES ($1,'caso',$2,$3::vector)`, [
    projectId,
    content,
    toVectorLiteral(await embedder.embed(content)),
  ]);
ok("seed: projeto + 7 etapas + 3 chunks no corpus");

// roda o Coordenador da etapa "ambiente" e persiste
const exec = (sql: string, params: unknown[]) => pg.query<RetrievedChunk>(sql, params);
const result = await runPillar(
  { provider: new MockProvider(), retriever: pgvectorRetriever(exec), embedder },
  { projectId, pillarType: "ambiente", motherQuestion: "Existe mercado real e acessível?" },
);
const pillarId = (
  await pg.query<{ id: string }>(`SELECT id FROM pillars WHERE project_id=$1 AND type='ambiente'`, [projectId])
).rows[0]!.id;
await persistPillarResult(q, { projectId, pillarId, pillarType: "ambiente", motherQuestion: "Existe mercado real e acessível?" }, result);

// asserções de persistência
const ev = (await pg.query<{ n: number }>(`SELECT count(*)::int n FROM evidences WHERE pillar_id=$1`, [pillarId])).rows[0]!.n;
ev === 3 ? ok(`3 evidências gravadas (das fontes)`) : fail(`evidências: esperava 3, veio ${ev}`);

const pillar = (
  await pg.query<{ status: string; score: number | null; logic: string | null }>(
    `SELECT status,score,logic FROM pillars WHERE id=$1`,
    [pillarId],
  )
).rows[0]!;
pillar.status === "pronta_para_gate" && pillar.score != null
  ? ok(`etapa atualizada (status=${pillar.status}, score=${pillar.score}, logic=${pillar.logic})`)
  : fail(`etapa não atualizada: ${JSON.stringify(pillar)}`);

const runs = (await pg.query<{ n: number }>(`SELECT count(*)::int n FROM agent_runs WHERE pillar_id=$1`, [pillarId]))
  .rows[0]!.n;
// ambiente é etapa enriquecida: background + competitive + quant + adversarial + sintetizador
runs === 5 ? ok("5 agent_runs (etapa enriquecida: telemetria de custo)") : fail(`agent_runs: esperava 5, veio ${runs}`);

// guarda da máquina de estados: gate numa etapa não-pronta deve falhar
try {
  const estrId = (await pg.query<{ id: string }>(`SELECT id FROM pillars WHERE project_id=$1 AND type='estrategia'`, [projectId]))
    .rows[0]!.id;
  await commitGateDecision(q, { projectId, pillarId: estrId, decision: "avancar", justification: "x", authorId: userId });
  fail("gate fora de pronta_para_gate deveria falhar");
} catch {
  ok("gate bloqueado em etapa não-pronta (máquina de estados)");
}

// gate "avançar" → commita versão da tese com diff
const gate = await commitGateDecision(q, {
  projectId,
  pillarId,
  decision: "avancar",
  justification: "Mercado existe; aposta com 2 redes-piloto.",
  authorId: userId,
  logic: "apostar",
});
gate.pillarStatus === "concluida" ? ok("etapa avançada → concluída") : fail(`status pós-gate: ${gate.pillarStatus}`);
gate.thesisVersion === "v0.1" ? ok(`versão da tese commitada (${gate.thesisVersion})`) : fail(`versão: ${gate.thesisVersion}`);

const tv = (
  await pg.query<{ version_label: string; diff: unknown; snapshot: unknown }>(
    `SELECT version_label, diff, snapshot FROM thesis_versions WHERE project_id=$1`,
    [projectId],
  )
).rows[0]!;
const diff = typeof tv.diff === "string" ? JSON.parse(tv.diff) : (tv.diff as { changes: unknown[] });
Array.isArray(diff.changes) && diff.changes.length >= 1
  ? ok(`diff legível com ${diff.changes.length} mudança(s)`)
  : fail("diff vazio");

console.log(failed ? "\nLOOP E2E: houve falhas." : "\nLOOP E2E OK: agentes → persistência → gate → tese versionada (Postgres real).");
process.exit(failed ? 1 : 0);
