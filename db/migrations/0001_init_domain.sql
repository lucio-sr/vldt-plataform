-- =====================================================================
-- Novo Labvie — Migration 0001: modelo de domínio (PRD §6.2 + §6.3)
-- Postgres + pgvector. ORM-agnóstico (psql, Drizzle introspect, Prisma db pull).
-- Data: 2026-06-23
-- Referências: PRD-labvie.md §6.2 (entidades), §6.3 (máquina de estados),
--              0002-ADR-stack-novo-labvie.md
-- Convenções: snake_case, uuid PK (gen_random_uuid), timestamptz, soft enums
--             via tipos PG, jsonb para campos flexíveis, embeddings via pgvector.
-- NOTA: as tabelas de credencial/sessão são gerenciadas pelo Better Auth;
--       a tabela `users` abaixo é o PERFIL de domínio (liga por email/id).
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector (RAG)

-- ---------- função utilitária: updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- ENUMS (máquina de estados e vocabulário do PRD)
-- =====================================================================
CREATE TYPE user_role              AS ENUM ('founder', 'consultor', 'admin');
CREATE TYPE project_mode           AS ENUM ('solo', 'assistido');
CREATE TYPE project_status         AS ENUM ('ativo', 'pausado', 'arquivado', 'concluido');
CREATE TYPE collaborator_role      AS ENUM ('consultor', 'observador');

-- Pilares = etapas AEIOU + Setup/Síntese (PRD §6.1)
CREATE TYPE pillar_type            AS ENUM ('setup','ambiente','estrategia','interacoes','operacoes','unificacao','sintese');
-- Estados da etapa (PRD §6.3): Não iniciada → Em pesquisa → Em diálogo → Pronta p/ gate → [concluída | arquivada]
CREATE TYPE pillar_status          AS ENUM ('nao_iniciada','em_pesquisa','em_dialogo','pronta_para_gate','concluida','arquivada');

-- Lógica de decisão (PRD §7.4)
CREATE TYPE decision_logic         AS ENUM ('planejar', 'apostar');

CREATE TYPE research_question_status AS ENUM ('aberta', 'respondida');
CREATE TYPE hypothesis_status      AS ENUM ('nao_testada', 'validada', 'refutada');
CREATE TYPE evidence_type          AS ENUM ('web', 'paper', 'dado', 'entrevista', 'analise');
CREATE TYPE confidence_level       AS ENUM ('forte', 'media', 'fraca', 'lacuna');
CREATE TYPE interview_status       AS ENUM ('pendente', 'processando', 'analisada');
CREATE TYPE experiment_status      AS ENUM ('planejado', 'rodando', 'concluido', 'cancelado');
CREATE TYPE gate_decision_type     AS ENUM ('avancar', 'voltar_pesquisar', 'arquivar');
CREATE TYPE risk_severity          AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE agent_run_status       AS ENUM ('pendente', 'rodando', 'concluido', 'falhou');
CREATE TYPE rag_source_type        AS ENUM ('caso', 'paper', 'transcricao', 'evidencia', 'documento');

-- =====================================================================
-- USERS — perfil de domínio (founder / consultor)
-- =====================================================================
CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  role        user_role NOT NULL DEFAULT 'founder',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- PROJECTS — uma jornada de um negócio
-- =====================================================================
CREATE TABLE projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  one_liner        text,                         -- frase sobre a ideia (Setup)
  stage            text,                          -- estágio livre: ideia, pre-pmf, ...
  mode             project_mode NOT NULL DEFAULT 'solo',
  status           project_status NOT NULL DEFAULT 'ativo',
  owner_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  current_pillar_id uuid,                          -- FK adicionada após pillars (abaixo)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_owner  ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- N–N consultor ↔ projeto (modo assistido)
CREATE TABLE project_collaborators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        collaborator_role NOT NULL DEFAULT 'consultor',
  invited_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (project_id, user_id)
);
CREATE INDEX idx_collab_project ON project_collaborators(project_id);
CREATE INDEX idx_collab_user    ON project_collaborators(user_id);

-- =====================================================================
-- PILLARS / ETAPAS — mini-projetos de pesquisa (estado da máquina §6.3)
-- =====================================================================
CREATE TABLE pillars (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        pillar_type NOT NULL,
  title       text,                               -- nome de founder (ex.: "O terreno")
  status      pillar_status NOT NULL DEFAULT 'nao_iniciada',
  score       int CHECK (score BETWEEN 0 AND 100),
  logic       decision_logic,                     -- planejar/apostar definido no gate
  position    int NOT NULL DEFAULT 0,             -- ordem de exibição
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, type)
);
CREATE INDEX idx_pillars_project ON pillars(project_id);
CREATE TRIGGER trg_pillars_updated BEFORE UPDATE ON pillars
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- agora que pillars existe, ligar projects.current_pillar_id
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_current_pillar
  FOREIGN KEY (current_pillar_id) REFERENCES pillars(id) ON DELETE SET NULL;

-- =====================================================================
-- RESEARCH QUESTIONS — pergunta-mãe + sub-perguntas por etapa
-- =====================================================================
CREATE TABLE research_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id   uuid NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  text        text NOT NULL,
  is_mother   boolean NOT NULL DEFAULT false,
  status      research_question_status NOT NULL DEFAULT 'aberta',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rq_pillar ON research_questions(pillar_id);
CREATE TRIGGER trg_rq_updated BEFORE UPDATE ON research_questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- INTERVIEWS — conversas com clientes (etapa Clientes/Interações)
-- =====================================================================
CREATE TABLE interviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_name   text,
  persona        text,
  media_url      text,                            -- storage S3 (gravação)
  transcript     text,
  ai_annotations jsonb NOT NULL DEFAULT '{}'::jsonb,  -- objeções, padrões, voice-of-customer
  consent        boolean NOT NULL DEFAULT false,  -- LGPD: consentimento de gravação
  status         interview_status NOT NULL DEFAULT 'pendente',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_interviews_project ON interviews(project_id);
CREATE TRIGGER trg_interviews_updated BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- HYPOTHESES — apostas testáveis com critério de falsificação
-- =====================================================================
CREATE TABLE hypotheses (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id              uuid NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  text                   text NOT NULL,
  falsification_criterion text,                   -- "X é falso se Y"
  status                 hypothesis_status NOT NULL DEFAULT 'nao_testada',
  metrics                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hyp_pillar ON hypotheses(pillar_id);
CREATE TRIGGER trg_hyp_updated BEFORE UPDATE ON hypotheses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- EVIDENCES / SOURCES — toda afirmação rastreável a uma fonte (PRD §5.2)
-- Liga-se opcionalmente a pillar, hipótese, pergunta ou entrevista.
-- =====================================================================
CREATE TABLE evidences (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pillar_id            uuid REFERENCES pillars(id) ON DELETE CASCADE,
  hypothesis_id        uuid REFERENCES hypotheses(id) ON DELETE SET NULL,
  research_question_id uuid REFERENCES research_questions(id) ON DELETE SET NULL,
  interview_id         uuid REFERENCES interviews(id) ON DELETE SET NULL,
  type                 evidence_type NOT NULL,
  title                text NOT NULL,
  source_url           text,
  source_origin        text,                       -- origem quando não há URL
  excerpt              text,                        -- trecho citável
  confidence           confidence_level NOT NULL DEFAULT 'media',
  embedding            vector(1536),                -- dimensão depende do modelo de embedding
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_project ON evidences(project_id);
CREATE INDEX idx_evidence_pillar  ON evidences(pillar_id);
CREATE INDEX idx_evidence_hyp     ON evidences(hypothesis_id);
CREATE INDEX idx_evidence_embedding ON evidences USING hnsw (embedding vector_cosine_ops);
CREATE TRIGGER trg_evidence_updated BEFORE UPDATE ON evidences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- EXPERIMENTS — validação de hipóteses (P2 no PRD, schema pronto)
-- =====================================================================
CREATE TABLE experiments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id uuid NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  description   text NOT NULL,
  target_metric text,
  result        text,
  status        experiment_status NOT NULL DEFAULT 'planejado',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_experiments_hyp ON experiments(hypothesis_id);
CREATE TRIGGER trg_experiments_updated BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- GATE DECISIONS — decisão humana ao fim da etapa (o humano decide §5.4)
-- =====================================================================
CREATE TABLE gate_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id     uuid NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  decision      gate_decision_type NOT NULL,
  justification text NOT NULL,
  accepted_risks text,
  logic         decision_logic,                    -- planejar/apostar declarado no gate
  author_id     uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gate_pillar ON gate_decisions(pillar_id);

-- =====================================================================
-- THESIS VERSIONS — a tese viva versionada (v0.1 → v1.0) + diff
-- =====================================================================
CREATE TABLE thesis_versions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_label text NOT NULL,                     -- "v0.1"
  version_major int NOT NULL DEFAULT 0,
  version_minor int NOT NULL DEFAULT 1,
  summary       text,
  snapshot      jsonb NOT NULL,                    -- snapshot completo da tese
  diff          jsonb,                              -- diff vs. versão anterior
  author_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version_label)
);
CREATE INDEX idx_thesis_project ON thesis_versions(project_id);

-- =====================================================================
-- ARTIFACTS / DELIVERABLES — entregáveis por etapa (mapa de mercado, jornada, pitch…)
-- =====================================================================
CREATE TABLE artifacts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pillar_id         uuid REFERENCES pillars(id) ON DELETE CASCADE,
  thesis_version_id uuid REFERENCES thesis_versions(id) ON DELETE SET NULL,
  type              text NOT NULL,                 -- mapa_mercado, market_sizing, jornada_cliente, pitch, plano_time...
  title             text,
  content           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artifacts_project ON artifacts(project_id);
CREATE INDEX idx_artifacts_pillar  ON artifacts(pillar_id);
CREATE TRIGGER trg_artifacts_updated BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- RISKS — mapa de riscos do projeto
-- =====================================================================
CREATE TABLE risks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity    risk_severity NOT NULL DEFAULT 'media',
  mitigation  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_risks_project ON risks(project_id);
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON risks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- AGENT RUNS — auditoria + telemetria de custo (substitui ai_operations_log)
-- =====================================================================
CREATE TABLE agent_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  pillar_id      uuid REFERENCES pillars(id) ON DELETE SET NULL,
  agent          text NOT NULL,                    -- coordenador, background_research, competitive, user_research, quant, adversarial, sintetizador
  model          text,
  input          jsonb,
  output         jsonb,
  sources        jsonb,
  input_tokens   int,
  output_tokens  int,
  cost_usd       numeric(12,6),
  status         agent_run_status NOT NULL DEFAULT 'pendente',
  error          text,
  correlation_id text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);
CREATE INDEX idx_agentruns_project ON agent_runs(project_id);
CREATE INDEX idx_agentruns_agent   ON agent_runs(agent);
CREATE INDEX idx_agentruns_created ON agent_runs(created_at);

-- =====================================================================
-- RAG CHUNKS — índice vetorial sobre o corpus (casos, papers, transcrições)
-- project_id NULL = corpus global (ex.: casos de referência)
-- =====================================================================
CREATE TABLE rag_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  source_type rag_source_type NOT NULL,
  source_ref  text,                                -- case_id, interview_id, url...
  content     text NOT NULL,
  embedding   vector(1536) NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rag_project   ON rag_chunks(project_id);
CREATE INDEX idx_rag_embedding ON rag_chunks USING hnsw (embedding vector_cosine_ops);

COMMIT;

-- =====================================================================
-- NOTAS DE IMPLEMENTAÇÃO
-- 1. Embeddings: vector(1536) assume text-embedding-3-small. Ajuste a dimensão
--    se trocar de modelo (3-large = 3072). Reindexar HNSW se mudar.
-- 2. Créditos de IA: tratados em migration separada (fora do escopo do §6.2);
--    a telemetria de custo já mora em agent_runs.
-- 3. Better Auth: cria suas próprias tabelas (sessions, accounts, verification).
--    Linkar pelo email/id de users. Não duplicar credenciais aqui.
-- 4. Soft-delete: usar status ('arquivado') em vez de DELETE para projetos/etapas
--    — preserva trilha de auditoria (PRD §14).
-- =====================================================================
