import type { Logger } from "@nestjs/common";
import {
  AnthropicProvider,
  type CoordinatorDeps,
  type LlmProvider,
  MockEmbedder,
  MockProvider,
  OpenAIEmbedder,
  OpenAIProvider,
  pgvectorRetriever,
  runPillar,
  runUserResearch,
  type SqlExec,
} from "@labvie/agents";
import pg from "pg";
import { type QueryFn, persistInterviewAnalysis, persistPillarResult } from "../pillars/persistence";
import type { InterviewAnalyzeJob, PillarResearchJob } from "./queue.tokens";

let pool: pg.Pool | undefined;
function getPool(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não definida");
    pool = new pg.Pool({ connectionString: url });
  }
  return pool;
}

/** Monta os agentes com providers reais quando há API keys; senão usa mocks. */
function pickProvider(): LlmProvider {
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider();
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  return new MockProvider();
}

function buildDeps(): CoordinatorDeps {
  const p = getPool();
  const exec: SqlExec = (sql, params) => p.query(sql, params);
  const embedder = process.env.OPENAI_API_KEY ? new OpenAIEmbedder() : new MockEmbedder();
  return { provider: pickProvider(), retriever: pgvectorRetriever(exec), embedder };
}

/** Roda o Coordenador de uma etapa e persiste o loop completo (PRD §10.2). */
export async function processPillarResearch(job: PillarResearchJob, logger: Logger): Promise<unknown> {
  const p = getPool();
  const q: QueryFn = (sql, params) => p.query(sql, params);

  const pillar = (await q(`SELECT id FROM pillars WHERE project_id = $1 AND type = $2`, [
    job.projectId,
    job.pillarType,
  ])).rows[0];
  if (!pillar) throw new Error(`etapa '${job.pillarType}' não encontrada no projeto`);

  const result = await runPillar(buildDeps(), {
    projectId: job.projectId,
    pillarType: job.pillarType,
    motherQuestion: job.motherQuestion,
  });

  await persistPillarResult(
    q,
    { projectId: job.projectId, pillarId: pillar.id, pillarType: job.pillarType, motherQuestion: job.motherQuestion },
    result,
  );

  logger.log(
    `pillar.research [${job.pillarType}] — ${result.research.sources.length} fontes, ` +
      `${result.adversarial.provocations.length} provocações, score ${result.synthesis.score}, ` +
      `custo $${result.totalCostUsd.toFixed(6)} → pronta para gate`,
  );
  return { score: result.synthesis.score, totalCostUsd: result.totalCostUsd };
}

/** Analisa uma entrevista: transcrição → voz-do-cliente/objeções/padrões → evidências. */
export async function processInterviewAnalysis(job: InterviewAnalyzeJob, logger: Logger): Promise<unknown> {
  const p = getPool();
  const q: QueryFn = (sql, params) => p.query(sql, params);

  const interview = (
    await q(`SELECT persona, transcript, consent FROM interviews WHERE id = $1 AND project_id = $2`, [
      job.interviewId,
      job.projectId,
    ])
  ).rows[0];
  if (!interview) throw new Error("entrevista não encontrada");
  if (!interview.consent) throw new Error("sem consentimento (LGPD) — análise não autorizada");
  if (!interview.transcript) throw new Error("entrevista sem transcrição");

  const pillar = (await q(`SELECT id FROM pillars WHERE project_id = $1 AND type = 'interacoes'`, [job.projectId]))
    .rows[0];

  const { output, run } = await runUserResearch(pickProvider(), {
    persona: interview.persona ?? undefined,
    transcript: interview.transcript,
  });

  await persistInterviewAnalysis(
    q,
    { interviewId: job.interviewId, projectId: job.projectId, pillarId: pillar?.id ?? null },
    output,
    run,
  );

  logger.log(
    `interview.analyze [${job.interviewId}] — ${output.evidences.length} evidências, ` +
      `${output.objections.length} objeções → analisada`,
  );
  return { evidences: output.evidences.length };
}
