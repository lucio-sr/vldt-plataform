# deploy/ — rascunhos de empacotamento (PONTO DE PARTIDA, NÃO TESTADOS)

Estes arquivos aceleram o deploy, mas **não foram executados**. Trate-os como esqueleto,
não como algo pronto. Valide em staging.

## Arquivos
- `Dockerfile.api` — API NestJS + worker, rodando via `tsx`.
- `Dockerfile.web` — build do Vite + nginx. Requer `--build-arg VITE_API_URL=...`.
- `nginx.conf` — config SPA (fallback para index.html).

## Gap importante (leia)
Os pacotes `@labvie/domain` e `@labvie/agents` são importados como **TypeScript cru**
(`main` = `src/index.ts`). Logo:
- `node dist/main.js` (script `start` do api) **não roda** sozinho — faltaria compilar
  esses pacotes para JS. Por isso o Dockerfile.api usa `tsx` em runtime, que é como a
  API comprovadamente sobe hoje.
- Caminho "definitivo" no futuro: bundlar a API com esbuild num único `.js` e aí usar
  `node`. Fica como melhoria, não bloqueia o deploy inicial.

## Migrations ANTES de subir a API
Com o `DATABASE_URL` de produção no ambiente:
```bash
npm ci
node db/migrate.mjs        # ou: npm run db:migrate  (carrega .env da raiz)
```
Rode isso uma vez por deploy que inclua migrations novas, antes de subir a API.

## Falta ainda (não incluso de propósito, decisão de infra)
- docker-compose de produção / manifests de orquestração (ECS, k8s, etc.).
- CI/CD.
- Postgres + Redis gerenciados (o docker-compose da raiz é só para DEV).
