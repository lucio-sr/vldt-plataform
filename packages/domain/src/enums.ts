import { z } from "zod";

/**
 * Enums do domínio — espelham exatamente os tipos PG em db/migrations/0001_init_domain.sql.
 * Vocabulário do PRD §6.1 e máquina de estados §6.3.
 */

export const userRole = z.enum(["founder", "consultor", "admin"]);
export type UserRole = z.infer<typeof userRole>;

export const projectMode = z.enum(["solo", "assistido"]);
export type ProjectMode = z.infer<typeof projectMode>;

export const projectStatus = z.enum(["ativo", "pausado", "arquivado", "concluido"]);
export type ProjectStatus = z.infer<typeof projectStatus>;

export const collaboratorRole = z.enum(["consultor", "observador"]);
export type CollaboratorRole = z.infer<typeof collaboratorRole>;

/** Pilares = etapas AEIOU + Setup/Síntese (PRD §6.1). */
export const pillarType = z.enum([
  "setup",
  "ambiente", // A — O terreno
  "estrategia", // E — Sua aposta
  "interacoes", // I — Seus clientes
  "operacoes", // O — A entrega
  "unificacao", // U — O time
  "sintese",
]);
export type PillarType = z.infer<typeof pillarType>;

/**
 * Máquina de estados da etapa (PRD §6.3):
 * nao_iniciada → em_pesquisa → em_dialogo → pronta_para_gate → [concluida | arquivada]
 */
export const pillarStatus = z.enum([
  "nao_iniciada",
  "em_pesquisa",
  "em_dialogo",
  "pronta_para_gate",
  "concluida",
  "arquivada",
]);
export type PillarStatus = z.infer<typeof pillarStatus>;

/** Lógica de decisão por gate (PRD §7.4). */
export const decisionLogic = z.enum(["planejar", "apostar"]);
export type DecisionLogic = z.infer<typeof decisionLogic>;

export const researchQuestionStatus = z.enum(["aberta", "respondida"]);
export type ResearchQuestionStatus = z.infer<typeof researchQuestionStatus>;

export const hypothesisStatus = z.enum(["nao_testada", "validada", "refutada"]);
export type HypothesisStatus = z.infer<typeof hypothesisStatus>;

export const evidenceType = z.enum(["web", "paper", "dado", "entrevista", "analise"]);
export type EvidenceType = z.infer<typeof evidenceType>;

/** Selo de evidência/confiança (PRD §12). */
export const confidenceLevel = z.enum(["forte", "media", "fraca", "lacuna"]);
export type ConfidenceLevel = z.infer<typeof confidenceLevel>;

export const interviewStatus = z.enum(["pendente", "processando", "analisada"]);
export type InterviewStatus = z.infer<typeof interviewStatus>;

export const experimentStatus = z.enum(["planejado", "rodando", "concluido", "cancelado"]);
export type ExperimentStatus = z.infer<typeof experimentStatus>;

/** Decisão de gate (PRD §6.3 / §10.2). */
export const gateDecisionType = z.enum(["avancar", "voltar_pesquisar", "arquivar"]);
export type GateDecisionType = z.infer<typeof gateDecisionType>;

export const riskSeverity = z.enum(["baixa", "media", "alta", "critica"]);
export type RiskSeverity = z.infer<typeof riskSeverity>;

export const agentRunStatus = z.enum(["pendente", "rodando", "concluido", "falhou"]);
export type AgentRunStatus = z.infer<typeof agentRunStatus>;

export const ragSourceType = z.enum(["caso", "paper", "transcricao", "evidencia", "documento"]);
export type RagSourceType = z.infer<typeof ragSourceType>;

/** Nomes canônicos dos agentes (ADR 0001 §3.8). */
export const agentName = z.enum([
  "coordenador",
  "background_research",
  "competitive_intelligence",
  "user_research",
  "quant_analysis",
  "adversarial",
  "sintetizador",
]);
export type AgentName = z.infer<typeof agentName>;
