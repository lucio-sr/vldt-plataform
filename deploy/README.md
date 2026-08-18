# deploy/ — implantação em uma VM Docker

O `docker-compose.prod.yml` da raiz sobe a aplicação inteira em uma única VM:
Postgres com pgvector, Redis, API e front-end. Postgres e Redis ficam somente
na rede interna do Docker — não há portas deles publicadas.

Por padrão, a API é publicada somente em `127.0.0.1:3001` e o front-end em
`127.0.0.1:8081`, para que um Nginx já instalado na VM faça o HTTPS. O serviço
Caddy é opcional e só inicia com o profile `with-caddy`.

> A configuração ainda deve ser validada na VM antes de usá-la como produção.

## Arquivos
- `Dockerfile.api` — API NestJS + worker, rodando via `tsx`.
- `Dockerfile.web` — build do Vite + nginx. Recebe `VITE_API_URL` pelo Compose.
- `nginx.conf` — config SPA (fallback para index.html).
- `Caddyfile` — proxy reverso e HTTPS automático para web e API (opcional).
- `.env.production.example` — modelo de variáveis para a VM.

## Primeira implantação

1. Aponte dois DNS para o IP da VM: `plataform.vldt.com.br` e
   `api.plataform.vldt.com.br`.
   Libere as portas TCP 80 e 443 no firewall/provedor.
2. Instale Docker Engine e o plugin Docker Compose na VM.
3. Copie o repositório para a VM e, na raiz deste projeto, crie o arquivo de
   segredos a partir do exemplo:

```bash
cp deploy/.env.production.example .env
chmod 600 .env
```

4. Edite `.env`: troque domínios, senha do Postgres e `BETTER_AUTH_SECRET`.
   A senha deve ser URL-segura (use letras, números, `-` e `_`) porque aparece
   também dentro de `DATABASE_URL`. Gere o segredo, por exemplo, com:

```bash
openssl rand -base64 48
```

5. Construa as imagens, aplique as migrations e inicie os serviços:

```bash
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env run --rm api node --import tsx db/migrate.mjs
docker compose -f docker-compose.prod.yml --env-file .env up -d
docker compose -f docker-compose.prod.yml ps
```

6. Configure o Nginx da VM para encaminhar os domínios a `127.0.0.1:8081`
   (web) e `127.0.0.1:3001` (API), então confirme que
   `https://api.plataform.vldt.com.br/health` responde.

### Alternativa: Caddy sem Nginx existente

Em uma VM sem outro proxy usando as portas 80/443, suba também o profile Caddy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env --profile with-caddy up -d
```

## Atualização

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env build
docker compose -f docker-compose.prod.yml --env-file .env run --rm api node --import tsx db/migrate.mjs
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Para acompanhar erros:

```bash
docker compose -f docker-compose.prod.yml logs -f api caddy
```

Faça backup periódico do volume `labvie_pgdata`; os dados do Postgres moram
nele e não são removidos por um `docker compose up` ou reinício comum.

## Gap importante (leia)
Os pacotes `@labvie/domain` e `@labvie/agents` são importados como **TypeScript cru**
(`main` = `src/index.ts`). Logo:
- `node dist/main.js` (script `start` do api) **não roda** sozinho — faltaria compilar
  esses pacotes para JS. Por isso o Dockerfile.api usa `tsx` em runtime, que é como a
  API comprovadamente sobe hoje.
- Caminho "definitivo" no futuro: bundlar a API com esbuild num único `.js` e aí usar
  `node`. Fica como melhoria, não bloqueia o deploy inicial.

## Ainda fora de escopo
- CI/CD.
- Postgres e Redis gerenciados (esta configuração os executa na própria VM).
