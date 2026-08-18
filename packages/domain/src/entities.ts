import { z } from "zod";
import {
  agentName,
  agentRunStatus,
  collaboratorRole,
  confidenceLevel,
  decisionLogic,
  evidenceType,
  experimentStatus,
  gateDecisionType,
  hypothesisStatus,
  interviewStatus,
  pillarStatus,
  pillarType,
  projectMode,
  projectStatus,
  ragSourceType,
  researchQuestionStatus,
  riskSeverity,
  userRole,
} from "./enums.js";

/**
 * Schemas Zod das entidades do PRD §6.2.
 * Fonte de verdade tipada — compartilhada por apps/api e apps/web.
 * Cada schema espelha uma tabela de db/migrations/0001_init_domain.sql.
 */

const id = z.uuid();
const ts = z.coerce.date();
const jsonb = z.record(z.string(), z.unknown());

// ---------- User ----------
export const userSchema = z.object({
  id,
  name: z.string().min(1),
  email: z.email(),
  role: userRole.default("founder"),
  preferences: jsonb.default({}),
  createdAt: ts,
  updatedAt: ts,
});
export type User = z.infer<typeof userSchema>;

// ---------- Project ----------
export const projectSchema = z.object({
  id,
  name: z.string().min(1),
  oneLiner: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  mode: projectMode.default("solo"),
  status: projectStatus.default("ativo"),
  ownerId: id,
  currentPillarId: id.nullable().optional(),
  createdAt: ts,
  updatedAt: ts,
});
export type Project = z.infer<typeof projectSchema>;

/** DTO de criação de projeto (Setup — PRD §10.1). */
export const createProjectSchema = z.object({
  name: z.string().min(1, "nome obrigatório"),
  oneLiner: z.string().max(280).optional(),
  mode: projectMode.default("solo"),
  stage: z.string().optional(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: projectStatus.optional(),
  currentPillarId: id.nullable().optional(),
});
export type UpdateProject = z.infer<typeof updateProjectSchema>;

// ---------- ProjectCollaborator (modo assistido) ----------
export const projectCollaboratorSchema = z.object({
  id,
  projectId: id,
  userId: id,
  role: collaboratorRole.default("consultor"),
  invitedAt: ts,
  acceptedAt: ts.nullable().optional(),
});
export type ProjectCollaborator = z.infer<typeof projectCollaboratorSchema>;

// ---------- Pillar / Etapa ----------
export const pillarSchema = z.object({
  id,
  projectId: id,
  type: pillarType,
  title: z.string().nullable().optional(),
  status: pillarStatus.default("nao_iniciada"),
  score: z.number().int().min(0).max(100).nullable().optional(),
  logic: decisionLogic.nullable().optional(),
  position: z.number().int().default(0),
  createdAt: ts,
  updatedAt: ts,
});
export type Pillar = z.infer<typeof pillarSchema>;

// ---------- ResearchQuestion ----------
export const researchQuestionSchema = z.object({
  id,
  pillarId: id,
  text: z.string().min(1),
  isMother: z.boolean().default(false),
  status: researchQuestionStatus.default("aberta"),
  createdAt: ts,
  updatedAt: ts,
});
export type ResearchQuestion = z.infer<typeof researchQuestionSchema>;

// ---------- Interview ----------
export const interviewSchema = z.object({
  id,
  projectId: id,
  contactName: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  aiAnnotations: jsonb.default({}),
  consent: z.boolean().default(false), // LGPD (PRD §14)
  status: interviewStatus.default("pendente"),
  createdAt: ts,
  updatedAt: ts,
});
export type Interview = z.infer<typeof interviewSchema>;

// ---------- Hypothesis ----------
export const hypothesisSchema = z.object({
  id,
  pillarId: id,
  text: z.string().min(1),
  falsificationCriterion: z.string().nullable().optional(), // "X é falso se Y"
  status: hypothesisStatus.default("nao_testada"),
  metrics: jsonb.default({}),
  createdAt: ts,
  updatedAt: ts,
});
export type Hypothesis = z.infer<typeof hypothesisSchema>;

// ---------- Evidence / Source ----------
export const evidenceSchema = z.object({
  id,
  projectId: id,
  pillarId: id.nullable().optional(),
  hypothesisId: id.nullable().optional(),
  researchQuestionId: id.nullable().optional(),
  interviewId: id.nullable().optional(),
  type: evidenceType,
  title: z.string().min(1),
  sourceUrl: z.string().nullable().optional(),
  sourceOrigin: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  confidence: confidenceLevel.default("media"),
  embedding: z.array(z.number()).nullable().optional(),
  metadata: jsonb.default({}),
  createdAt: ts,
  updatedAt: ts,
});
export type Evidence = z.infer<typeof evidenceSchema>;

// ---------- Experiment ----------
export const experimentSchema = z.object({
  id,
  hypothesisId: id,
  description: z.string().min(1),
  targetMetric: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
  status: experimentStatus.default("planejado"),
  createdAt: ts,
  updatedAt: ts,
});
export type Experiment = z.infer<typeof experimentSchema>;

// ---------- GateDecision ----------
export const gateDecisionSchema = z.object({
  id,
  pillarId: id,
  decision: gateDecisionType,
  justification: z.string().min(1, "gate exige justificativa humana"), // PRD §5.4
  acceptedRisks: z.string().nullable().optional(),
  logic: decisionLogic.nullable().optional(),
  authorId: id,
  createdAt: ts,
});
export type GateDecision = z.infer<typeof gateDecisionSchema>;

// ---------- ThesisVersion ----------
export const thesisVersionSchema = z.object({
  id,
  projectId: id,
  versionLabel: z.string().regex(/^v\d+\.\d+$/, "formato vX.Y"),
  versionMajor: z.number().int().default(0),
  versionMinor: z.number().int().default(1),
  summary: z.string().nullable().optional(),
  snapshot: jsonb,
  diff: jsonb.nullable().optional(),
  authorId: id.nullable().optional(),
  createdAt: ts,
});
export type ThesisVersion = z.infer<typeof thesisVersionSchema>;

// ---------- Artifact / Deliverable ----------
export const artifactSchema = z.object({
  id,
  projectId: id,
  pillarId: id.nullable().optional(),
  thesisVersionId: id.nullable().optional(),
  type: z.string().min(1), // mapa_mercado, market_sizing, jornada_cliente, pitch, plano_time...
  title: z.string().nullable().optional(),
  content: jsonb.default({}),
  createdAt: ts,
  updatedAt: ts,
});
export type Artifact = z.infer<typeof artifactSchema>;

// ---------- Risk ----------
export const riskSchema = z.object({
  id,
  projectId: id,
  description: z.string().min(1),
  severity: riskSeverity.default("media"),
  mitigation: z.string().nullable().optional(),
  createdAt: ts,
  updatedAt: ts,
});
export type Risk = z.infer<typeof riskSchema>;

// ---------- AgentRun (auditoria + custo) ----------
export const agentRunSchema = z.object({
  id,
  projectId: id.nullable().optional(),
  pillarId: id.nullable().optional(),
  agent: agentName,
  model: z.string().nullable().optional(),
  input: jsonb.nullable().optional(),
  output: jsonb.nullable().optional(),
  sources: jsonb.nullable().optional(),
  inputTokens: z.number().int().nullable().optional(),
  outputTokens: z.number().int().nullable().optional(),
  costUsd: z.number().nullable().optional(),
  status: agentRunStatus.default("pendente"),
  error: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  createdAt: ts,
  completedAt: ts.nullable().optional(),
});
export type AgentRun = z.infer<typeof agentRunSchema>;

// ---------- RagChunk ----------
export const ragChunkSchema = z.object({
  id,
  projectId: id.nullable().optional(), // null = corpus global
  sourceType: ragSourceType,
  sourceRef: z.string().nullable().optional(),
  content: z.string().min(1),
  embedding: z.array(z.number()),
  metadata: jsonb.default({}),
  createdAt: ts,
});
export type RagChunk = z.infer<typeof ragChunkSchema>;
