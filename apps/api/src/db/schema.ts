/**
 * Schema Drizzle — espelha db/migrations/0001_init_domain.sql.
 * A migration SQL é a FONTE DE VERDADE do DDL (incl. índices e pgvector).
 * Este schema existe para consultas tipadas; mantenha-o sincronizado com o .sql.
 */
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// ---------------- enums ----------------
export const userRole = pgEnum("user_role", ["founder", "consultor", "admin"]);
export const projectMode = pgEnum("project_mode", ["solo", "assistido"]);
export const projectStatus = pgEnum("project_status", ["ativo", "pausado", "arquivado", "concluido"]);
export const collaboratorRole = pgEnum("collaborator_role", ["consultor", "observador"]);
export const pillarType = pgEnum("pillar_type", [
  "setup", "ambiente", "estrategia", "interacoes", "operacoes", "unificacao", "sintese",
]);
export const pillarStatus = pgEnum("pillar_status", [
  "nao_iniciada", "em_pesquisa", "em_dialogo", "pronta_para_gate", "concluida", "arquivada",
]);
export const decisionLogic = pgEnum("decision_logic", ["planejar", "apostar"]);
export const researchQuestionStatus = pgEnum("research_question_status", ["aberta", "respondida"]);
export const hypothesisStatus = pgEnum("hypothesis_status", ["nao_testada", "validada", "refutada"]);
export const evidenceType = pgEnum("evidence_type", ["web", "paper", "dado", "entrevista", "analise"]);
export const confidenceLevel = pgEnum("confidence_level", ["forte", "media", "fraca", "lacuna"]);
export const interviewStatus = pgEnum("interview_status", ["pendente", "processando", "analisada"]);
export const experimentStatus = pgEnum("experiment_status", ["planejado", "rodando", "concluido", "cancelado"]);
export const gateDecisionType = pgEnum("gate_decision_type", ["avancar", "voltar_pesquisar", "arquivar"]);
export const riskSeverity = pgEnum("risk_severity", ["baixa", "media", "alta", "critica"]);
export const agentRunStatus = pgEnum("agent_run_status", ["pendente", "rodando", "concluido", "falhou"]);
export const ragSourceType = pgEnum("rag_source_type", ["caso", "paper", "transcricao", "evidencia", "documento"]);

// ---------------- tables ----------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // campos exigidos pelo Better Auth (modelo "user" unificado ao domínio)
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("founder"),
  preferences: jsonb("preferences").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- tabelas do Better Auth (ADR 0002 D3) ----------
// Nomes plurais (usePlural:true no adapter). Ids uuid gerados pelo DB (generateId:false).
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  activeOrganizationId: uuid("active_organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- plugin organization (modo assistido — ADR 0002 / PRD §8) ----------
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inviterId: uuid("inviter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  oneLiner: text("one_liner"),
  stage: text("stage"),
  mode: projectMode("mode").notNull().default("solo"),
  status: projectStatus("status").notNull().default("ativo"),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  currentPillarId: uuid("current_pillar_id").references((): AnyPgColumn => pillars.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectCollaborators = pgTable("project_collaborators", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: collaboratorRole("role").notNull().default("consultor"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const pillars = pgTable("pillars", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: pillarType("type").notNull(),
  title: text("title"),
  status: pillarStatus("status").notNull().default("nao_iniciada"),
  score: integer("score"),
  logic: decisionLogic("logic"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const researchQuestions = pgTable("research_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pillarId: uuid("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isMother: boolean("is_mother").notNull().default(false),
  status: researchQuestionStatus("status").notNull().default("aberta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  contactName: text("contact_name"),
  persona: text("persona"),
  mediaUrl: text("media_url"),
  transcript: text("transcript"),
  aiAnnotations: jsonb("ai_annotations").notNull().default({}),
  consent: boolean("consent").notNull().default(false),
  status: interviewStatus("status").notNull().default("pendente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hypotheses = pgTable("hypotheses", {
  id: uuid("id").defaultRandom().primaryKey(),
  pillarId: uuid("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  falsificationCriterion: text("falsification_criterion"),
  status: hypothesisStatus("status").notNull().default("nao_testada"),
  metrics: jsonb("metrics").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evidences = pgTable("evidences", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  pillarId: uuid("pillar_id").references(() => pillars.id, { onDelete: "cascade" }),
  hypothesisId: uuid("hypothesis_id").references(() => hypotheses.id, { onDelete: "set null" }),
  researchQuestionId: uuid("research_question_id").references(() => researchQuestions.id, { onDelete: "set null" }),
  interviewId: uuid("interview_id").references(() => interviews.id, { onDelete: "set null" }),
  type: evidenceType("type").notNull(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourceOrigin: text("source_origin"),
  excerpt: text("excerpt"),
  confidence: confidenceLevel("confidence").notNull().default("media"),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const experiments = pgTable("experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  hypothesisId: uuid("hypothesis_id").notNull().references(() => hypotheses.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  targetMetric: text("target_metric"),
  result: text("result"),
  status: experimentStatus("status").notNull().default("planejado"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gateDecisions = pgTable("gate_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pillarId: uuid("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }),
  decision: gateDecisionType("decision").notNull(),
  justification: text("justification").notNull(),
  acceptedRisks: text("accepted_risks"),
  logic: decisionLogic("logic"),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const thesisVersions = pgTable("thesis_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  versionLabel: text("version_label").notNull(),
  versionMajor: integer("version_major").notNull().default(0),
  versionMinor: integer("version_minor").notNull().default(1),
  summary: text("summary"),
  snapshot: jsonb("snapshot").notNull(),
  diff: jsonb("diff"),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  pillarId: uuid("pillar_id").references(() => pillars.id, { onDelete: "cascade" }),
  thesisVersionId: uuid("thesis_version_id").references(() => thesisVersions.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  title: text("title"),
  content: jsonb("content").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const risks = pgTable("risks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  severity: riskSeverity("severity").notNull().default("media"),
  mitigation: text("mitigation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  pillarId: uuid("pillar_id").references(() => pillars.id, { onDelete: "set null" }),
  agent: text("agent").notNull(),
  model: text("model"),
  input: jsonb("input"),
  output: jsonb("output"),
  sources: jsonb("sources"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
  status: agentRunStatus("status").notNull().default("pendente"),
  error: text("error"),
  correlationId: text("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const ragChunks = pgTable("rag_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  sourceType: ragSourceType("source_type").notNull(),
  sourceRef: text("source_ref"),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------- relations (consultas tipadas) ----------------
export const projectRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  pillars: many(pillars),
  thesisVersions: many(thesisVersions),
  interviews: many(interviews),
}));

export const pillarRelations = relations(pillars, ({ one, many }) => ({
  project: one(projects, { fields: [pillars.projectId], references: [projects.id] }),
  researchQuestions: many(researchQuestions),
  hypotheses: many(hypotheses),
  gateDecisions: many(gateDecisions),
}));
