import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DecisionLogic, GateDecisionType } from "@labvie/domain";
import pg from "pg";
import { PG_POOL } from "../db/db.module";
import { type QueryFn, commitGateDecision } from "./persistence";

/** Pergunta-mãe padrão por etapa (semente; depois vem da ontologia/Setup). */
const DEFAULT_QUESTION: Record<string, string> = {
  ambiente: "Existe um mercado real e acessível para esta ideia?",
  estrategia: "Qual é a aposta central e por que ela é diferenciada?",
  interacoes: "Quem é o cliente e a dor está validada por evidência?",
  operacoes: "Qual a operação mínima que entrega valor de forma consistente?",
  unificacao: "Quem executa, como se decide e o que pode quebrar primeiro?",
};

@Injectable()
export class PillarsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  private get q(): QueryFn {
    return (sql, params) => this.pool.query(sql, params);
  }

  async getThesis(projectId: string) {
    const { rows } = await this.q(
      `SELECT version_label, summary, diff, created_at
       FROM thesis_versions WHERE project_id = $1
       ORDER BY version_major DESC, version_minor DESC`,
      [projectId],
    );
    return rows;
  }

  /** Tese atual consolidada (T6): a síntese mais recente de cada etapa. */
  async getCurrentThesis(projectId: string) {
    const { rows } = await this.q(
      `SELECT DISTINCT ON (p.type) p.type AS pillar, p.score AS score, a.content AS content
       FROM artifacts a JOIN pillars p ON p.id = a.pillar_id
       WHERE a.project_id = $1 AND a.type = 'sintese_etapa'
       ORDER BY p.type, a.created_at DESC`,
      [projectId],
    );
    return rows.map((r) => {
      const c = typeof r.content === "string" ? JSON.parse(r.content) : r.content;
      return {
        pillar: r.pillar as string,
        score: r.score as number | null,
        claim: (c?.synthesis?.claim as string | undefined) ?? null,
        confidence: (c?.synthesis?.confidence as string | undefined) ?? null,
      };
    });
  }

  async getWorkspace(projectId: string, type: string) {
    const pillar = (
      await this.q(`SELECT id, status, score, logic FROM pillars WHERE project_id = $1 AND type = $2`, [
        projectId,
        type,
      ])
    ).rows[0];
    if (!pillar) throw new NotFoundException("etapa não encontrada");

    const questions = (
      await this.q(`SELECT text, is_mother, status FROM research_questions WHERE pillar_id = $1`, [pillar.id])
    ).rows;
    const evidences = (
      await this.q(
        `SELECT title, source_origin, confidence FROM evidences WHERE pillar_id = $1 ORDER BY created_at`,
        [pillar.id],
      )
    ).rows;
    const synthesis = (
      await this.q(
        `SELECT content FROM artifacts WHERE pillar_id = $1 AND type = 'sintese_etapa' ORDER BY created_at DESC LIMIT 1`,
        [pillar.id],
      )
    ).rows[0];

    return { pillar, questions, evidences, synthesis: synthesis?.content ?? null };
  }

  async gate(
    projectId: string,
    type: string,
    input: { decision: GateDecisionType; justification: string; authorId: string; logic?: DecisionLogic | null },
  ) {
    const pillar = (await this.q(`SELECT id FROM pillars WHERE project_id = $1 AND type = $2`, [projectId, type]))
      .rows[0];
    if (!pillar) throw new NotFoundException("etapa não encontrada");
    return commitGateDecision(this.q, {
      projectId,
      pillarId: pillar.id,
      decision: input.decision,
      justification: input.justification,
      authorId: input.authorId,
      logic: input.logic ?? null,
    });
  }

  defaultQuestion(type: string): string {
    return DEFAULT_QUESTION[type] ?? "Qual é a pergunta-mãe desta etapa?";
  }
}
