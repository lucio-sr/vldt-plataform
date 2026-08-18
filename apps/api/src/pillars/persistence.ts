import { applyGateDecision, type DecisionLogic, type GateDecisionType } from "@labvie/domain";
import type { AgentRunRecord, PillarResult, UserResearchOutput } from "@labvie/agents";

/**
 * Persistência do loop da etapa (PRD §10.2) — funções puras sobre um QueryFn
 * agnóstico de driver (node-postgres em prod, PGlite nos testes).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type QueryFn = (sql: string, params?: unknown[]) => Promise<{ rows: Row[] }>;

export interface PillarRunContext {
  projectId: string;
  pillarId: string;
  pillarType: string;
  motherQuestion: string;
}

/** Grava a saída do Coordenador: pergunta, evidências, síntese, etapa, telemetria. */
export async function persistPillarResult(
  q: QueryFn,
  ctx: PillarRunContext,
  result: PillarResult,
): Promise<void> {
  // pergunta-mãe (idempotente)
  await q(`DELETE FROM research_questions WHERE pillar_id = $1 AND is_mother = true`, [ctx.pillarId]);
  await q(
    `INSERT INTO research_questions (pillar_id, text, is_mother, status) VALUES ($1, $2, true, 'respondida')`,
    [ctx.pillarId, ctx.motherQuestion],
  );

  // evidências (a partir das fontes da pesquisa)
  for (const s of result.research.sources) {
    await q(
      `INSERT INTO evidences (project_id, pillar_id, type, title, source_origin, confidence)
       VALUES ($1, $2, 'analise', $3, $4, $5)`,
      [ctx.projectId, ctx.pillarId, s.title, s.origin, s.confidence],
    );
  }

  // artefato de síntese (research + adversarial + synthesis)
  await q(
    `INSERT INTO artifacts (project_id, pillar_id, type, title, content)
     VALUES ($1, $2, 'sintese_etapa', $3, $4::jsonb)`,
    [
      ctx.projectId,
      ctx.pillarId,
      `Síntese — ${ctx.pillarType}`,
      JSON.stringify({
        research: result.research,
        competitive: result.competitive ?? null,
        quant: result.quant ?? null,
        adversarial: result.adversarial,
        synthesis: result.synthesis,
      }),
    ],
  );

  // atualiza a etapa: score, lógica, status → pronta para gate
  await q(`UPDATE pillars SET score = $2, logic = $3, status = 'pronta_para_gate' WHERE id = $1`, [
    ctx.pillarId,
    result.synthesis.score,
    result.synthesis.recommendedLogic,
  ]);

  // telemetria de custo por agente
  for (const r of result.runs) {
    await q(
      `INSERT INTO agent_runs (project_id, pillar_id, agent, model, input_tokens, output_tokens, cost_usd, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'concluido', now())`,
      [ctx.projectId, ctx.pillarId, r.agent, r.model, r.inputTokens, r.outputTokens, r.costUsd],
    );
  }
}

/** Persiste a análise de uma entrevista (User Research): anotações + evidências tipo entrevista. */
export async function persistInterviewAnalysis(
  q: QueryFn,
  ctx: { interviewId: string; projectId: string; pillarId: string | null },
  analysis: UserResearchOutput,
  run?: AgentRunRecord,
): Promise<void> {
  await q(`UPDATE interviews SET ai_annotations = $2::jsonb, status = 'analisada' WHERE id = $1`, [
    ctx.interviewId,
    JSON.stringify({
      voice_of_customer: analysis.voice_of_customer,
      objections: analysis.objections,
      patterns: analysis.patterns,
    }),
  ]);

  for (const e of analysis.evidences) {
    await q(
      `INSERT INTO evidences (project_id, pillar_id, interview_id, type, title, excerpt, confidence)
       VALUES ($1, $2, $3, 'entrevista', $4, $5, $6)`,
      [ctx.projectId, ctx.pillarId, ctx.interviewId, e.title, e.excerpt, e.confidence],
    );
  }

  if (run) {
    await q(
      `INSERT INTO agent_runs (project_id, pillar_id, agent, model, input_tokens, output_tokens, cost_usd, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'concluido', now())`,
      [ctx.projectId, ctx.pillarId, run.agent, run.model, run.inputTokens, run.outputTokens, run.costUsd],
    );
  }
}

export interface GateInput {
  projectId: string;
  pillarId: string;
  decision: GateDecisionType;
  justification: string;
  authorId: string;
  logic?: DecisionLogic | null;
}

/**
 * Registra a decisão de gate (o humano decide — PRD §5.4), aplica a máquina de
 * estados (§6.3) e, em "avançar", commita uma nova versão da tese com diff.
 */
export async function commitGateDecision(
  q: QueryFn,
  input: GateInput,
): Promise<{ pillarStatus: string; thesisVersion?: string }> {
  const cur = (await q(`SELECT status FROM pillars WHERE id = $1`, [input.pillarId])).rows[0];
  if (!cur) throw new Error("etapa não encontrada");

  // valida e calcula o próximo estado (lança se não estiver em pronta_para_gate)
  const next = applyGateDecision(cur.status, input.decision);

  await q(
    `INSERT INTO gate_decisions (pillar_id, decision, justification, logic, author_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.pillarId, input.decision, input.justification, input.logic ?? null, input.authorId],
  );
  await q(`UPDATE pillars SET status = $2 WHERE id = $1`, [input.pillarId, next]);

  let thesisVersion: string | undefined;
  if (input.decision === "avancar") {
    thesisVersion = await commitThesisVersion(q, input.projectId, input.authorId);
  }
  return { pillarStatus: next, thesisVersion };
}

/** Snapshot da tese a partir das sínteses de etapa + diff vs. versão anterior. */
export async function commitThesisVersion(
  q: QueryFn,
  projectId: string,
  authorId: string,
): Promise<string> {
  const rows = (
    await q(
      `SELECT p.type AS type, a.content AS content
       FROM artifacts a JOIN pillars p ON p.id = a.pillar_id
       WHERE a.project_id = $1 AND a.type = 'sintese_etapa'
       ORDER BY a.created_at`,
      [projectId],
    )
  ).rows;

  const sections: Record<string, unknown> = {};
  for (const r of rows) {
    const content = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
    sections[r.type] = content.synthesis; // mais recente vence
  }
  const snapshot = { sections };

  const prev = (
    await q(
      `SELECT version_major, version_minor, snapshot FROM thesis_versions
       WHERE project_id = $1 ORDER BY version_major DESC, version_minor DESC LIMIT 1`,
      [projectId],
    )
  ).rows[0];

  const major = prev ? prev.version_major : 0;
  const minor = prev ? prev.version_minor + 1 : 1;
  const label = `v${major}.${minor}`;
  const prevSnapshot = prev
    ? typeof prev.snapshot === "string"
      ? JSON.parse(prev.snapshot)
      : prev.snapshot
    : null;
  const diff = computeDiff(prevSnapshot, snapshot);

  await q(
    `INSERT INTO thesis_versions (project_id, version_label, version_major, version_minor, summary, snapshot, diff, author_id)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
    [projectId, label, major, minor, "Commit após decisão de gate", JSON.stringify(snapshot), JSON.stringify(diff), authorId],
  );
  return label;
}

export interface ThesisDiff {
  changes: { type: "add" | "change"; pillar: string; claim: string }[];
}

export function computeDiff(prev: { sections?: Record<string, unknown> } | null, next: { sections: Record<string, unknown> }): ThesisDiff {
  const prevSec = prev?.sections ?? {};
  const changes: ThesisDiff["changes"] = [];
  for (const [pillar, syn] of Object.entries(next.sections)) {
    const before = prevSec[pillar];
    const claim = (syn as { claim?: string })?.claim ?? "";
    if (before === undefined) changes.push({ type: "add", pillar, claim });
    else if (JSON.stringify(before) !== JSON.stringify(syn)) changes.push({ type: "change", pillar, claim });
  }
  return { changes };
}
