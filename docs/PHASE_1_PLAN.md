# OfertaML — Plano Consolidado da Fase 1

> Sistema de gerenciamento de ofertas Mercado Livre para WhatsApp.
> Documento de especificação técnica para execução via Claude Code.

---

## 1. Contexto

Sou Jaime, systems analyst, afiliado do Mercado Livre. Construindo micro-SaaS
para automatizar coleta de ofertas e publicação em grupos de WhatsApp.

Ambiente já estabelecido:
- VPS Ubuntu, 2 vCPU, 8 GB RAM, 80 GB disco, swap 4 GB
- Portainer rodando em `portal.cotec.net.br`
- Traefik existente, escutando network Docker `network_public`
- Domínio: `ml.cotec.net.br`

Repositório: `git@github.com:jaimevendrame/ml.git`

---

## 2. Stack confirmada

### Aplicação
- **Frontend + API principal**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Auth**: Better Auth (email + senha, single tenant)
- **ORM**: Drizzle
- **Banco**: Postgres 16 self-hosted (volume Docker)
- **WhatsApp service**: Microserviço Go usando whatsmeow (REST interno)
- **Scraper**: Worker Node.js + Playwright (sob demanda)
- **Link Builder worker**: Worker Node.js que renova links de afiliado via cookie

### Infraestrutura
- **Orquestração**: Docker Compose via Portainer Stack
- **Proxy reverso**: Traefik existente (network `network_public`)
- **Registry**: GHCR (GitHub Container Registry)
- **CI/CD**: GitHub Actions → build → push GHCR → webhook Portainer
- **Backup**: `prodrigestivill/postgres-backup-local` (cron interno + volume Docker)

### Domínios
- `ml.cotec.net.br` — Dashboard Next.js (público com auth)
- WhatsApp service: apenas network interna, sem exposição externa

---

## 3. Decisões arquiteturais críticas

### 3.1 API do Mercado Livre

- **NÃO usar** `/sites/MLB/search` — retorna 403 frequente, sem documentação clara
- **Usar `/items/{ITEM_ID}` (público)** — estável, sem necessidade de OAuth
- **Usar `/items/{ITEM_ID}/prices`** — endpoint atual recomendado para preço promocional
- **Cache em memória** de 30 min por item_id (Map simples no worker)
- **Retry exponencial** em 429/5xx, máximo 3 tentativas
- **Rate limit interno**: máximo 5 req/seg

### 3.2 Descoberta de ofertas

- Playwright headless carrega URLs de categoria definidas em `categorias` no banco
  (ex: `https://www.mercadolivre.com.br/ofertas`, `https://lista.mercadolivre.com.br/eletrodomesticos/_Deal_mlb-deal-of-the-day`)
- Extrai `item_ids` dos cards visíveis (parsing do permalink ou data attributes)
- Roda **sob demanda** (gatilhado por API) — não fica residente em memória

### 3.3 Geração de link de afiliado (LIÇÃO IMPORTANTE)

ML não oferece API pública para gerar link de afiliado.

**Solução**: usar cookie de sessão do Link Builder (`https://www.mercadolivre.com.br/afiliados/link-builder`).

- Worker dedicado consome ofertas em status `pendente`, chama o endpoint interno
  do Link Builder (URL exata a descobrir inspecionando o navegador, estimativa:
  `/affiliate-program/api/links` ou similar) e atualiza para `pronto`
- Cookie expira → estado `cookie_expired` → notificação no dashboard pra renovar
- Tela `/configuracoes/link-builder` para colar/atualizar cookie + botão "Testar"
- **Segurança Fase 1**: cookie em texto plano no banco (criptografia fica pra Fase 2),
  mas **nunca logar o cookie completo** — apenas hash dos primeiros 8 chars

### 3.4 Máquina de estados das ofertas

```
pendente   → coletada, ainda sem link de afiliado
pronto     → link gerado, na fila de envio
enviada    → publicada em pelo menos 1 grupo
rejeitada  → humano marcou como ruim (opcional)
expirada   → mais de 24h sem ser enviada → arquivada à meia-noite
```

### 3.5 Anti-spam e variedade

- Randomizar fila de envio (não FIFO puro) para variar categorias
- Janela horária por grupo (`janela_inicio` e `janela_fim` em horas)
- Intervalo mínimo entre posts no mesmo grupo (default 5 min, configurável)
- Não republicar mesma oferta no mesmo grupo em 24h
- Job de arquivamento à meia-noite: move enviadas/expiradas → `ofertas_arquivadas`

### 3.6 Limites de recurso (VPS apertado: 8 GB total compartilhado com outras stacks)

- Playwright: limite 1 GB, sob demanda apenas
- Postgres produção: `shared_buffers=512MB`, `max_connections=50`
- Cada container Node: limite 512 MB
- whatsapp-service Go: limite 256 MB
- Healthcheck em todos, restart `unless-stopped`

---

## 4. Ambiente de desenvolvimento (VPS via SSH)

Este projeto será desenvolvido via Claude Code rodando direto na VPS via SSH.

### 4.1 Portas em uso na VPS

Antes de subir qualquer serviço dev, verificar:
```bash
ss -tulpn | grep LISTEN
```

### 4.2 Portas dev sugeridas (fora do padrão)

- Next.js dev: **3500** (em vez de 3000)
- Postgres dev: **5532** (em vez de 5432)
- whatsapp-service dev: **8580**
- scraper-service dev: **8581**
- link-builder dev: **8582**

### 4.3 Estratégia de memória durante desenvolvimento

- Postgres dev sobe via `docker-compose.dev.yml` (~200 MB)
- Next.js roda como `pnpm dev` direto no host (sem Docker, ~300 MB)
- whatsapp-service roda como `go run ./cmd/server` direto no host (~50 MB)
- Workers de scraper e link-builder: rodar individualmente conforme estiver testando
- **Não rodar tudo simultaneamente** — apenas o que está sendo testado no momento

### 4.4 Diretório de trabalho

- Repositório clonado em `/home/${USER}/projetos/ml/`
- Volumes Docker dev em `/var/lib/docker/volumes/ml_dev_*`
- Stack de produção fica completamente separada (nome `ofertaml` no Portainer)
- Claude Code **NUNCA** deve mexer manualmente em containers da stack `ofertaml`
  de produção — apenas via `git push main` que dispara o webhook

### 4.5 Comandos úteis na VPS

```bash
free -h                                      # memória disponível
docker stats --no-stream                     # uso por container
ss -tulpn | grep LISTEN                      # portas em uso
docker logs ofertaml_web --tail 50 -f        # logs de produção (sem mexer)
```

---

## 5. Estrutura do monorepo

```
ml/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # lint + typecheck + build em PRs
│       └── deploy.yml              # build + push GHCR + webhook (main)
├── apps/
│   ├── web/                        # Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── signup/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── ofertas/page.tsx
│   │   │   │   ├── grupos/page.tsx
│   │   │   │   ├── categorias/page.tsx
│   │   │   │   └── configuracoes/
│   │   │   │       └── link-builder/page.tsx
│   │   │   └── api/
│   │   │       ├── auth/[...all]/route.ts   # better-auth
│   │   │       ├── ofertas/
│   │   │       │   ├── route.ts             # GET listagem
│   │   │       │   ├── coletar/route.ts     # POST dispara scraper
│   │   │       │   └── [id]/
│   │   │       │       ├── publicar/route.ts
│   │   │       │       └── route.ts
│   │   │       ├── grupos/route.ts
│   │   │       ├── whatsapp/
│   │   │       │   ├── qr/route.ts          # proxy GET → wa-service
│   │   │       │   └── status/route.ts
│   │   │       └── link-builder/
│   │   │           └── cookie/route.ts      # POST atualiza cookie
│   │   ├── lib/
│   │   │   ├── db.ts                # drizzle client
│   │   │   ├── auth.ts              # better-auth setup
│   │   │   ├── ml-api.ts            # cliente /items/{id}
│   │   │   ├── whatsapp-client.ts   # HTTP client → wa-service
│   │   │   ├── scraper-client.ts    # HTTP client → scraper-service
│   │   │   └── env.ts               # validação Zod das envs
│   │   ├── components/
│   │   ├── Dockerfile
│   │   ├── next.config.ts           # output: 'standalone'
│   │   └── package.json
│   │
│   ├── whatsapp-service/            # Go + whatsmeow
│   │   ├── cmd/server/main.go
│   │   ├── internal/
│   │   │   ├── handlers/
│   │   │   │   ├── qr.go
│   │   │   │   ├── send.go
│   │   │   │   ├── groups.go
│   │   │   │   └── status.go
│   │   │   ├── whatsapp/
│   │   │   │   ├── client.go        # wrapper whatsmeow
│   │   │   │   └── store.go         # session em SQLite
│   │   │   └── config/config.go
│   │   ├── Dockerfile
│   │   └── go.mod
│   │
│   ├── scraper-service/             # Worker Node + Playwright
│   │   ├── src/
│   │   │   ├── index.ts             # HTTP server (POST /scrape)
│   │   │   ├── scraper.ts           # lógica Playwright
│   │   │   └── parser.ts            # extração de IDs
│   │   ├── Dockerfile               # baseado em mcr.microsoft.com/playwright
│   │   └── package.json
│   │
│   └── link-builder-worker/         # Worker Node renovação de links
│       ├── src/
│       │   ├── index.ts             # HTTP server + worker loop
│       │   ├── link-builder.ts      # chama endpoint ML com cookie
│       │   └── cookie-health.ts     # health check periódico
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── db/                          # schema drizzle compartilhado
│   │   ├── schema/
│   │   │   ├── ofertas.ts
│   │   │   ├── grupos.ts
│   │   │   ├── publicacoes.ts
│   │   │   ├── categorias.ts
│   │   │   ├── ml-sessions.ts
│   │   │   └── auth.ts              # better-auth tables
│   │   ├── migrations/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── shared/                      # tipos TypeScript compartilhados
│       ├── src/
│       │   ├── types.ts
│       │   └── constants.ts
│       └── package.json
│
├── deploy/
│   ├── docker-compose.dev.yml       # dev local (apenas Postgres)
│   ├── docker-compose.prod.yml      # produção (Portainer Stack)
│   ├── .env.example
│   └── .env.example.prod
│
├── docs/
│   ├── DEPLOY.md                    # passo a passo Portainer
│   ├── DEVELOPMENT.md               # setup local
│   ├── COOKIE_RENEWAL.md            # como pegar cookie Link Builder
│   ├── ARCHITECTURE.md
│   └── decisions/                   # ADRs
│
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                       # Turborepo para builds incrementais
├── .gitignore
├── .nvmrc                           # Node 20
└── README.md
```

---

## 6. Schema do banco (Drizzle ORM)

```typescript
// packages/db/schema/ofertas.ts
export const statusOfertaEnum = pgEnum('status_oferta', [
  'pendente', 'pronto', 'enviada', 'rejeitada', 'expirada'
]);

export const ofertas = pgTable('ofertas', {
  id: uuid('id').primaryKey().defaultRandom(),
  mlItemId: text('ml_item_id').notNull().unique(),
  titulo: text('titulo').notNull(),
  precoAtual: numeric('preco_atual', { precision: 10, scale: 2 }).notNull(),
  precoOriginal: numeric('preco_original', { precision: 10, scale: 2 }),
  descontoPct: integer('desconto_pct'),
  imagemUrl: text('imagem_url'),
  permalink: text('permalink').notNull(),
  linkAfiliado: text('link_afiliado'),
  categoriaId: uuid('categoria_id').references(() => categorias.id),
  status: statusOfertaEnum('status').notNull().default('pendente'),
  mlSessionId: uuid('ml_session_id').references(() => mlSessions.id),
  ultimoErro: text('ultimo_erro'),
  coletadoEm: timestamp('coletado_em', { withTimezone: true }).defaultNow(),
  enriquecidoEm: timestamp('enriquecido_em', { withTimezone: true }),
  publicadoEm: timestamp('publicado_em', { withTimezone: true }),
});

// packages/db/schema/grupos.ts
export const grupos = pgTable('grupos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  jid: text('jid').notNull().unique(),         // 120363xxxx@g.us
  ativo: boolean('ativo').notNull().default(true),
  janelaInicio: integer('janela_inicio').notNull().default(8),
  janelaFim: integer('janela_fim').notNull().default(22),
  intervaloMinMin: integer('intervalo_min_minutos').notNull().default(5),
  ultimoEnvio: timestamp('ultimo_envio', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

// packages/db/schema/categorias.ts
export const categorias = pgTable('categorias', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  url: text('url').notNull(),
  ativa: boolean('ativa').notNull().default(true),
  ultimaColeta: timestamp('ultima_coleta', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

// packages/db/schema/publicacoes.ts
export const publicacoes = pgTable('publicacoes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ofertaId: uuid('oferta_id').references(() => ofertas.id).notNull(),
  grupoId: uuid('grupo_id').references(() => grupos.id).notNull(),
  enviadoEm: timestamp('enviado_em', { withTimezone: true }).defaultNow(),
  status: text('status').notNull().default('enviado'),
  erro: text('erro'),
});

// packages/db/schema/ml-sessions.ts
export const mlSessions = pgTable('ml_link_builder_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cookieRaw: text('cookie_raw').notNull(),
  cookieHashPreview: text('cookie_hash_preview'),
  tagAfiliado: text('tag_afiliado').notNull(),
  ativa: boolean('ativa').notNull().default(true),
  ultimoUso: timestamp('ultimo_uso', { withTimezone: true }),
  ultimoErro: text('ultimo_erro'),
  ultimoErroEm: timestamp('ultimo_erro_em', { withTimezone: true }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
});

// Tabela espelho para arquivamento (mesma estrutura)
export const ofertasArquivadas = pgTable('ofertas_arquivadas', { /* ... mesmo schema */ });
```

**Índices importantes**: `idx_ofertas_status`, `idx_ofertas_coletado_em`,
`idx_publicacoes_oferta`, `idx_publicacoes_grupo`.

---

## 7. Variáveis de ambiente

### `.env.example` (dev local)

```env
# === Database ===
DATABASE_URL=postgres://ofertaml:devpass@localhost:5532/ofertaml

# === Auth ===
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3500

# === Mercado Livre ===
ML_AFFILIATE_TAG=
ML_API_BASE=https://api.mercadolibre.com

# === Serviços internos ===
WHATSAPP_SERVICE_URL=http://localhost:8580
SCRAPER_SERVICE_URL=http://localhost:8581
LINK_BUILDER_SERVICE_URL=http://localhost:8582

# === Service auth (entre microserviços) ===
INTERNAL_SERVICE_TOKEN=generate-with-openssl-rand-hex-32

# === Next.js dev port ===
PORT=3500
```

### `.env.example.prod` (Portainer Stack)

```env
# === Domínios ===
DOMAIN=ml.cotec.net.br
TRAEFIK_NETWORK=network_public

# === Database ===
POSTGRES_USER=ofertaml
POSTGRES_PASSWORD=
POSTGRES_DB=ofertaml
DATABASE_URL=postgres://ofertaml:${POSTGRES_PASSWORD}@postgres:5432/ofertaml

# === Auth ===
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://ml.cotec.net.br

# === Mercado Livre ===
ML_AFFILIATE_TAG=

# === Internal ===
INTERNAL_SERVICE_TOKEN=

# === GHCR ===
GHCR_IMAGE_TAG=latest
```

---

## 8. docker-compose.dev.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5532:5432"
    environment:
      POSTGRES_USER: ofertaml
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: ofertaml
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ofertaml"]
      interval: 5s

volumes:
  postgres_dev_data:
```

---

## 9. docker-compose.prod.yml (Portainer Stack)

```yaml
networks:
  ofertaml_internal:
    driver: bridge
  network_public:
    external: true

volumes:
  postgres_data:
  postgres_backups:
  whatsmeow_session:

services:
  postgres:
    image: postgres:16-alpine
    networks: [ofertaml_internal]
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    command:
      - postgres
      - -c
      - shared_buffers=512MB
      - -c
      - max_connections=50
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
    deploy:
      resources:
        limits:
          memory: 1G
    restart: unless-stopped

  postgres-backup:
    image: prodrigestivill/postgres-backup-local:16
    networks: [ofertaml_internal]
    volumes:
      - postgres_backups:/backups
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 6
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 128M
    restart: unless-stopped

  web:
    image: ghcr.io/jaimevendrame/ml/web:${GHCR_IMAGE_TAG}
    networks: [ofertaml_internal, network_public]
    environment:
      DATABASE_URL: ${DATABASE_URL}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      ML_AFFILIATE_TAG: ${ML_AFFILIATE_TAG}
      WHATSAPP_SERVICE_URL: http://whatsapp:8080
      SCRAPER_SERVICE_URL: http://scraper:8081
      LINK_BUILDER_SERVICE_URL: http://link-builder:8082
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=network_public"
      - "traefik.http.routers.ofertaml.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.ofertaml.entrypoints=websecure"
      - "traefik.http.routers.ofertaml.tls.certresolver=letsencrypt"
      - "traefik.http.services.ofertaml.loadbalancer.server.port=3000"
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
    restart: unless-stopped

  whatsapp:
    image: ghcr.io/jaimevendrame/ml/whatsapp-service:${GHCR_IMAGE_TAG}
    networks: [ofertaml_internal]
    volumes: [whatsmeow_session:/data]
    environment:
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
      SESSION_PATH: /data/session.db
    deploy:
      resources:
        limits:
          memory: 256M
    restart: unless-stopped

  scraper:
    image: ghcr.io/jaimevendrame/ml/scraper-service:${GHCR_IMAGE_TAG}
    networks: [ofertaml_internal]
    environment:
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
    deploy:
      resources:
        limits:
          memory: 1G
    restart: unless-stopped

  link-builder:
    image: ghcr.io/jaimevendrame/ml/link-builder-worker:${GHCR_IMAGE_TAG}
    networks: [ofertaml_internal]
    environment:
      DATABASE_URL: ${DATABASE_URL}
      INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
    restart: unless-stopped
```

---

## 10. GitHub Actions

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: jaimevendrame/ml

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        service: [web, whatsapp-service, scraper-service, link-builder-worker]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/${{ matrix.service }}/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Portainer Webhook
        run: |
          curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

### Secrets necessários no GitHub
- `PORTAINER_WEBHOOK_URL` — gerado depois que a stack estiver criada no Portainer

---

## 11. Tarefas detalhadas — execute nesta ordem

### Tarefa 1: Setup do monorepo
- Inicializar pnpm workspaces + Turborepo
- `.nvmrc` com Node 20
- ESLint + Prettier compartilhados na raiz
- README inicial
- `.gitignore` cobrindo: `node_modules`, `.next`, `dist`, `.env`, `*.db`, `coverage`

### Tarefa 2: Schema do banco com Drizzle
- Setup do `packages/db`
- Schema completo conforme seção 6
- Migrations iniciais (`drizzle-kit generate`)
- Seed script com 1 categoria de exemplo

### Tarefa 3: Postgres dev local
- `docker-compose.dev.yml` conforme seção 8
- Scripts no `package.json` raiz: `db:up`, `db:down`, `db:push`, `db:migrate`, `db:studio`

### Tarefa 4: whatsapp-service Go (standalone primeiro)
- Módulo Go com whatsmeow (`go.mod` Go 1.23+)
- Endpoints: `GET /qr`, `GET /status`, `POST /send`, `GET /groups`
- Auth via header `X-Internal-Token`
- Sessão SQLite em `/data/session.db` (variável `SESSION_PATH`)
- Dockerfile multi-stage (final image baseada em Alpine, ~30 MB)
- Logging com slog em JSON
- **Smoke test**: subir localmente, escanear QR, listar grupos via curl

### Tarefa 5: scraper-service (Playwright)
- HTTP server simples (Hono ou Express)
- Endpoint `POST /scrape` recebe `{ urls: string[] }`
- Para cada URL: abre Playwright, aguarda render, extrai item_ids
- Retorna `{ urls: [{ url, itemIds: string[], errors }] }`
- Dockerfile baseado em `mcr.microsoft.com/playwright:v1.48.0-jammy`
- Headless, user-agent realista, timeout de 30s
- **Smoke test**: rodar contra URL real de ofertas e verificar que retorna 20+ IDs

### Tarefa 6: Cliente ML API (`apps/web/lib/ml-api.ts`)
```typescript
export async function getItem(itemId: string): Promise<MLItem>
export async function getItemPrices(itemId: string): Promise<MLPrices>
export function calculateDiscount(item: MLItem, prices: MLPrices): {
  precoAtual: number;
  precoOriginal: number | null;
  descontoPct: number | null;
}
```
- Cache em memória 30 min
- Retry exponencial com max 3 tentativas
- Rate limit interno: max 5 req/seg

### Tarefa 7: link-builder-worker
- HTTP server `POST /enrich-pending` (chama renovação manualmente)
- Worker loop interno: a cada 60s busca ofertas `pendente` (limite 10)
  e tenta gerar link
- Endpoint POST do ML (URL exata a descobrir inspecionando o navegador no Link Builder)
- Tratamento de erros:
  - 401/403 → marca sessão como `cookie_expired`, para o loop, alerta no banco
  - 429 → backoff exponencial
  - sucesso → atualiza oferta para `pronto` com link

### Tarefa 8: Better Auth no Next.js
- Setup com email + senha
- Página `/login` e `/signup` (signup desabilitado depois do primeiro user)
- Middleware protegendo todas as rotas exceto `/login`, `/signup` e `/api/auth/*`
- User table no schema Drizzle (compatível com Better Auth)

### Tarefa 9: Dashboard — páginas

**`/ofertas`**:
- Botão "Coletar agora" → POST `/api/ofertas/coletar`
- Lista paginada com filtro por status
- Cards: imagem, título, preço, desconto badge, status badge, link permalink
- Ações: aprovar (manual), rejeitar, publicar agora (modal selecionar grupo)

**`/categorias`**:
- CRUD básico de categorias
- Toggle ativo/inativo
- Última coleta timestamp

**`/grupos`**:
- QR code do WhatsApp (proxy `/api/whatsapp/qr`)
- Status de conexão (polling 5s)
- Lista de grupos detectados (do whatsmeow)
- Toggle "ativo" + janela horária + intervalo

**`/configuracoes/link-builder`**:
- Textarea pra colar cookie
- Campo tag de afiliado
- Botão "Testar agora" → tenta gerar link de URL exemplo
- Status: ativa, último uso, último erro
- Documentação inline: "Como obter o cookie" (link pra `docs/COOKIE_RENEWAL.md`)

### Tarefa 10: API routes Next.js

- `POST /api/ofertas/coletar`:
  1. Busca categorias ativas
  2. Chama `scraper-service` com URLs
  3. Para cada item_id retornado: chama getItem + getItemPrices
  4. UPSERT em `ofertas` com status `pendente`
  5. Retorna `{ coletadas, novas, erros }`
- `POST /api/ofertas/[id]/publicar`:
  1. Busca oferta + valida que está `pronto`
  2. Monta mensagem formatada
  3. POST `whatsapp-service/send` com `{ jid, text, image_url }`
  4. INSERT em `publicacoes`
  5. UPDATE oferta para `enviada`
- `GET /api/whatsapp/qr` — proxy autenticado pro wa-service
- `POST /api/link-builder/cookie` — atualiza cookie ativo

### Tarefa 11: Template de mensagem (1 fixo na Fase 1)

```
🔥 *OFERTA IMPERDÍVEL*

📦 {titulo}

💸 De: ~R$ {preco_original}~
✅ Por: *R$ {preco_atual}*
🎯 Desconto: {desconto_pct}% OFF

🔗 {link_afiliado}
```

### Tarefa 12: docker-compose.prod.yml + DEPLOY.md

- Compose conforme seção 9
- DEPLOY.md com:
  1. Como criar a stack no Portainer pela primeira vez
     (Stacks → Add stack → Repository → URL do repo → compose path `deploy/docker-compose.prod.yml`)
  2. Variáveis de ambiente a preencher
  3. Como gerar e configurar o webhook (Service Webhooks no Portainer)
  4. Como pegar a webhook URL e adicionar como secret `PORTAINER_WEBHOOK_URL` no GitHub
  5. Como rodar migrations: `docker exec ofertaml_web pnpm db:migrate`
  6. Como criar primeiro usuário admin
  7. Como verificar logs de cada serviço no Portainer
  8. Rollback: alterar `GHCR_IMAGE_TAG` para SHA anterior e redeploy
  9. Como verificar backup: `docker exec ofertaml_postgres-backup ls -la /backups/last/`
  10. Como restaurar backup:
      ```bash
      docker exec -i ofertaml_postgres psql -U ofertaml -d ofertaml < backup.sql
      ```

### Tarefa 13: COOKIE_RENEWAL.md

Tutorial passo a passo:
1. Acessar `https://www.mercadolivre.com.br/afiliados/link-builder`
2. Fazer login com sua conta
3. F12 → aba Network
4. Colar uma URL qualquer no Link Builder e clicar "Gerar link"
5. Filtrar requests por "create-link" ou similar
6. Copiar o cookie completo (Right-click no request → Copy → Copy as cURL →
   extrair header Cookie, OU copiar direto da aba Headers)
7. Colar em `/configuracoes/link-builder`
8. Clicar "Testar agora"

### Tarefa 14: GitHub Actions

- Workflow `ci.yml`: roda em PRs, faz `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build`
- Workflow `deploy.yml`: conforme seção 10
- Adicionar badge no README

### Tarefa 15: README.md final

- Visão geral
- Stack
- Setup local (3 comandos)
- Estrutura
- Links: DEPLOY.md, DEVELOPMENT.md, COOKIE_RENEWAL.md, ARCHITECTURE.md

---

## 12. Critério de aceite da Fase 1

### Em ambiente local
- [ ] `pnpm install && docker compose -f deploy/docker-compose.dev.yml up -d && pnpm dev` sobe tudo
- [ ] Login funciona
- [ ] Pareio meu WhatsApp pelo QR
- [ ] Vejo meus grupos
- [ ] Cadastro 1 categoria com URL real do ML
- [ ] Colo cookie do Link Builder, testo, marca como ativa
- [ ] Clico "Coletar agora" → vejo 5+ ofertas como `pendente`
- [ ] Em até 1 minuto, link-builder converte pra `pronto`
- [ ] Clico "Publicar agora" em uma oferta
- [ ] Recebo a mensagem formatada no grupo do WhatsApp
- [ ] `publicacoes` registrado no banco

### Em produção
- [ ] `git push main` → GitHub Actions builda e pusheia 4 imagens no GHCR
- [ ] Webhook do Portainer dispara redeploy
- [ ] Stack atualiza sem downtime perceptível
- [ ] `https://ml.cotec.net.br` responde com SSL válido
- [ ] Backup automático rodando — verificar com:
      `docker exec ofertaml_postgres-backup ls -la /backups/last/`

---

## 13. O que NÃO fazer nesta fase

- ❌ Scheduler/cron de coleta automática (Fase 2)
- ❌ Score de ofertas (Fase 3)
- ❌ Multi-tenant (Fase 5)
- ❌ Múltiplos números WhatsApp (Fase 5)
- ❌ Analytics de cliques (Fase 4)
- ❌ Templates customizáveis (Fase 4)
- ❌ Redis/BullMQ
- ❌ Testes E2E (apenas smoke tests)
- ❌ Criptografia do cookie no banco (Fase 2 — usar plain por enquanto + alertar)

---

## 14. Convenções

- Commits em português, formato Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
- Granularidade: 1 commit por tarefa concluída
- Branch de trabalho: `feat/fase-1-{tarefa}`
- PR para `develop` ao final de cada tarefa, merge pra `main` ao final da fase
- Não commitar `.env` — apenas `.env.example`
- Documentar decisões técnicas não óbvias em `docs/decisions/` (ADRs simples)

---

## 15. Ordem de execução

1. Tarefa 1 (monorepo)
2. Tarefa 2 (schema)
3. Tarefa 3 (postgres dev)
4. Tarefa 4 (whatsapp-service standalone — provar conexão WA)
5. Tarefa 5 (scraper standalone — provar coleta de IDs)
6. Tarefa 6 (cliente ML API com testes)
7. Tarefa 7 (link-builder — provar geração de link)
8. SOMENTE ENTÃO Tarefas 8-11 (integração no Next.js)
9. Tarefa 12-15 (deploy + docs)

**Quando houver bloqueio** (cookie expirado, endpoint mudou, algo não funciona como
esperado), parar e avisar antes de improvisar workarounds complexos.

---

## 16. Checklist de credenciais (preencher antes do deploy)

### Já disponível
- [x] Domínio `ml.cotec.net.br`
- [x] VPS com Portainer + Traefik (network `network_public`)
- [x] Go 1.23.4 instalado

### A preparar antes da Tarefa 14
- [ ] Repositório `jaimevendrame/ml` criado no GitHub (privado)
- [ ] Personal Access Token GitHub com escopo `write:packages`
- [ ] Access Token do Portainer
- [ ] Endpoint ID do Portainer
- [ ] Secret `PORTAINER_WEBHOOK_URL` (após criar stack)

### A obter quando o sistema estiver rodando
- [ ] Tag de afiliado do ML
- [ ] Cookie do Link Builder (pelo dashboard, seguindo `COOKIE_RENEWAL.md`)
