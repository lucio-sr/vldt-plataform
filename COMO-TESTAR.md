# Como testar o Novo Labvie

Três níveis, do mais rápido (zero infra) ao produto rodando no browser.

## Pré-requisitos
- **Node 22+** (os scripts usam `--env-file`, `--watch` e `--import tsx` nativos).
- **Docker** — só para o Nível 2 (Postgres + Redis).
- **Chave de LLM** (Anthropic ou OpenAI) — opcional, só para o Nível 3. Sem chave, tudo funciona com providers mock.

Todos os comandos rodam dentro de `novo-labvie/`.

```bash
cd novo-labvie
npm install
```

---

## Nível 1 — Verificação offline (2 min, sem Docker, sem chave)

Prova a maior parte da lógica sem subir nada. Use isto primeiro.

```bash
npm run typecheck                       # tipos dos 4 workspaces
npm test                                # domain (15) + agents (4)
npm run db:test                         # migrations num Postgres WASM (PGlite) + pgvector
npm run test:loop -w @labvie/api        # loop: agentes → evidências/síntese → gate → tese versionada
npm run test:interview -w @labvie/api   # entrevista: transcrição → análise → evidências
npm run test:e2e -w @labvie/api         # Better Auth: sign-up / sign-in / senha errada
```

O que cada um garante:
- **db:test / test:loop / test:interview / test:e2e** rodam contra um Postgres real (PGlite, em memória) — migrations, FKs, máquina de estados, pgvector, o pipeline dos 7 agentes (com MockProvider) e o auth, tudo de verdade, sem internet.
- Se todos passarem, o núcleo do produto está íntegro.

---

## Nível 2 — Stack completa no browser (Docker, sem chave de IA)

Roda o produto inteiro. **Funciona sem chave de LLM** — o worker usa o MockProvider (saídas "de mentira", mas o fluxo é real).

```bash
cp .env.example .env          # valores padrão já servem para local
docker compose up -d          # Postgres+pgvector (5432) + Redis (6379)
npm run db:migrate            # aplica db/migrations/* no Postgres
```

Em **dois terminais**:
```bash
npm run dev:api               # API + worker em http://localhost:3001
npm run dev:web               # web em http://localhost:5173
```

No browser, em `http://localhost:5173`:
1. **Criar conta** (aba "Criar conta") → entra direto.
2. **Criar um projeto** (nome + frase). Ele já nasce com as 7 etapas.
3. Abrir o projeto → **"Rodar pesquisa"** numa etapa (ex.: O terreno). Isso enfileira o job; o worker processa em segundos.
4. Atualizar a página da etapa → ver **síntese, fontes, provocações** e o **bloco de gate**.
5. Escrever uma justificativa e **Avançar → commitar**. 
6. Ir em **A tese** e **Histórico** → ver a tese consolidada e a versão com diff.

Parar tudo: `docker compose down` (use `-v` para apagar o volume do banco).

---

## Nível 3 — Com IA real

Edite o `.env` e adicione pelo menos uma chave; reinicie a API.

```bash
# Anthropic (recomendado p/ raciocínio) e/ou OpenAI (embeddings p/ RAG real)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...          # necessário p/ embeddings reais (RAG); senão usa mock
EMBEDDING_MODEL=text-embedding-3-small
```

Reinicie `npm run dev:api`. Agora "Rodar pesquisa" faz pesquisa real e os custos aparecem na tabela `agent_runs`. **Atenção: consome tokens (custo real).**

> Seleção de provider (em `apps/api/src/queue/agents-runner.ts`): se houver `ANTHROPIC_API_KEY` usa Claude; senão `OPENAI_API_KEY` usa GPT; senão Mock. Embeddings: usa OpenAI se houver `OPENAI_API_KEY`, senão mock.

---

## Espiar o banco (opcional)

```bash
docker exec -it labvie-db psql -U labvie -d labvie -c \
  "SELECT agent, model, cost_usd FROM agent_runs ORDER BY created_at DESC LIMIT 10;"
docker exec -it labvie-db psql -U labvie -d labvie -c \
  "SELECT version_label, diff FROM thesis_versions;"
```

---

## Se algo travar

- **Login não persiste / erro de CORS:** confirme `WEB_ORIGIN=http://localhost:5173` no `.env` (já está em `trustedOrigins` do Better Auth) e que API (3001) e web (5173) estão nas portas padrão.
- **"DATABASE_URL não definida":** você esqueceu de `cp .env.example .env` (os scripts carregam o `.env` da raiz).
- **Worker não processa:** o Redis precisa estar de pé (`docker compose up -d`). Sem Redis, a API sobe mas o job fica preso — você verá avisos de conexão Redis no log.
- **`--env-file` reclama:** Node < 20.6. Use Node 22.
- **Porta ocupada:** ajuste `API_PORT` no `.env` e `VITE_API_URL` (a web aponta para `http://localhost:3001` por padrão).

---

## O que NÃO está testado aqui (honesto)
- O fluxo de browser com a stack real (Nível 2/3) não foi exercitado por mim — foi validado por typecheck + build + e2e do backend. O primeiro a rodar de verdade é você.
- Providers reais (Anthropic/OpenAI) têm teste de **contrato** (formato da request/parsing), mas não houve chamada real a API.
- Itens P2 do PRD (experimentos, sugestão de especialista, benchmark) e telas de entrevistas/colaboração do consultor ainda não existem.
