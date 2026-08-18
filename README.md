# Novo Labvie

Copesquisador estratégico para criação de negócios inovadores. Implementação do `PRD-labvie.md` (v0.1) com a stack do `0002-ADR-stack-novo-labvie.md`.

> **Não é** o `labvie-repo` (produto antigo, Lovable/Supabase). Este é o produto novo, do zero, TS ponta a ponta, sem Supabase.

## Stack
- **DB:** Postgres + pgvector
- **API:** Node + TypeScript (NestJS)
- **ORM:** Drizzle
- **Auth:** Better Auth
- **Jobs:** BullMQ (Redis)
- **Storage:** S3-compatível
- **Front-end:** React + Vite + shadcn/Tailwind
- **LLM:** mix por papel (Sonnet 4.6 workhorse, Opus 4.8 síntese, GPT-5-mini/Haiku 4.5 alto volume)

## Estrutura
```
novo-labvie/
├── apps/
│   ├── api/        # NestJS — REST, auth, workers de agentes
│   └── web/        # React + Vite
├── packages/
│   ├── domain/     # tipos + Zod do PRD §6.2 (fonte de verdade tipada)
│   └── agents/     # (Fase C) 7 agentes AEIOU + orchestrator
├── aeiou/          # método: ontology, cases, pipeline (Fase B)
└── db/
    └── migrations/ # 0001_init_domain.sql ...
```

## Setup (dev)
```bash
cp .env.example .env          # preencher segredos
npm install                   # instala todos os workspaces
docker compose up -d          # Postgres+pgvector (5432) + Redis (6379)
npm run db:migrate            # aplica db/migrations/*.sql (0001 + 0002)
npm run dev:api               # API em http://localhost:3001
npm run dev:web               # web em http://localhost:5173
```

Endpoints: `GET /health` (público) · `POST /api/auth/*` (Better Auth: sign-up/sign-in) ·
`GET|POST /projects` (exige sessão) · `POST /jobs/ping` (enfileira job dummy).

## Estado atual (Fase A concluída + Fase B em andamento)
- [x] Monorepo + workspaces; `packages/domain` (Zod §6.2 + máquina de estados §6.3) testado
- [x] Migrations `0001` (domínio) + `0002` (auth) + `0003` (organization) + schema Drizzle
- [x] API: health + Projects sobre Drizzle; fila BullMQ + job dummy
- [x] Better Auth (email/senha) ligado + **plugin organization** (modo assistido); sessão substitui o DEMO_OWNER_ID
- [x] docker-compose (Postgres+pgvector + Redis)
- [x] **Fase B — web:** design system editorial (Fraunces+Inter, tokens) + react-router; telas **T3 Dashboard** e **T4 Workspace da etapa** (todos os estados: pesquisa/síntese/diálogo/gate) com dados mock
- [x] **Fase B — método:** ontologia AEIOU (`aeiou/ontology/*.yaml`, 5 pilares) + `gen:schemas` (YAML→JSON Schema)
- [x] **Fase B — telas T6 (Tese) e T7 (Histórico/Diff)** — todas as telas prioritárias do Apêndice A presentes
- [x] **Fase C — `packages/agents`:** LLM provider (Anthropic/OpenAI/Mock) + roteador de modelos por papel + pricing; RAG (embeddings + retriever pgvector); agentes Background/Adversarial/Sintetizador + **Coordenador**; pipeline testado (Mock + PGlite, sem API keys)
- [x] **Fase C — worker:** BullMQ `pillar.research` → Coordenador; persiste `agent_runs` (telemetria de custo)
- [x] **Loop completo persistido (PRD §10.2):** agentes → evidências + síntese + etapa atualizada → **gate** (máquina de estados, o humano decide) → **versão da tese com diff**. Endpoints: `GET /projects/:id/thesis`, `GET/POST /projects/:id/pillars/:type[/run|/gate]`
- [x] **App ligado de ponta a ponta:** login/cadastro no browser (Better Auth client), e as telas T1/T3/T4/T6/T7 leem e escrevem na API real (criar projeto, rodar pesquisa de etapa, decidir gate, ver tese e histórico). Sessão por cookie.
- [x] **7 agentes completos:** Coordenador + Background + **Competitive Intelligence** + **Quant Analysis** + **User Research** + Adversarial + Sintetizador. Etapas `ambiente`/`estrategia` rodam o tratamento enriquecido (competitive + quant).
- [x] **Ingestão de entrevista (PRD §10.3):** `POST /projects/:id/interviews` (com consentimento LGPD) → fila → User Research analisa a transcrição → anotações + evidências tipo entrevista.
- [x] **Providers reais testados por contrato** (fetch mockado): Anthropic e OpenAI montam request/headers/body e parseiam usage/custo.
- [ ] Falta para produção: smoke test dos providers com **API keys reais**; P2 do PRD (experimentos, sugestão de especialista, benchmark de casos); telas de entrevistas/colaboração no web.

### Suíte de testes (sem Docker, sem API keys)
```bash
npm run typecheck                       # 4 workspaces
npm test                                # domain (15) + agents (4: pipeline, user research, contratos)
npm run db:test                         # migrations contra PGlite (21 tabelas, pgvector)
npm run test:loop -w @labvie/api        # loop: agentes → persistência → gate → tese
npm run test:interview -w @labvie/api   # entrevista: transcrição → análise → evidências
npm run test:e2e -w @labvie/api         # Better Auth sign-up/sign-in
```

### Testar sem API keys
```bash
npm test -w @labvie/agents       # Coordenador + RAG sobre PGlite (MockProvider)
npm run test:loop -w @labvie/api # loop completo: agentes → persistência → gate → tese versionada
```

### Testar migrations sem Docker
```bash
npm run db:test   # aplica db/migrations/* num Postgres WASM (PGlite) + asserções (inclui pgvector)
```

> Validado: typecheck dos 3 workspaces, 15/15 testes do domain, API sobe e `/health` 200,
> e **as migrations rodam contra um Postgres real** (PGlite/WASM) com pgvector — `npm run db:test`.
> Falta apenas validar o fluxo de sign-up/sign-in do Better Auth contra o Postgres do compose (`docker compose up` + `npm run db:migrate`).

Roadmap completo: `../aeiou-vldt/plano-trabalho-novo-labvie.md`.
# vldt-plataform
