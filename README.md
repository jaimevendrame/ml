# OfertaML

Sistema de gerenciamento de ofertas do Mercado Livre para publicação automática em grupos de WhatsApp.

## Stack

- **Frontend + API**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Auth**: Better Auth (email + senha)
- **ORM**: Drizzle + Postgres 16
- **WhatsApp**: whatsmeow (Go)
- **Scraper**: Playwright (Node.js)
- **Infra**: Docker Compose + Traefik + Portainer

## Setup local

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir Postgres dev
pnpm db:up

# 3. Rodar migrations e iniciar app
pnpm db:migrate && pnpm dev
```

> Requisitos: Node 20+, pnpm 10+, Docker, Go 1.23+

## Estrutura

```
apps/
  web/                   # Next.js — dashboard principal
  whatsapp-service/      # Go — integração WhatsApp
  scraper-service/       # Node + Playwright — coleta de ofertas
  link-builder-worker/   # Node — geração de links de afiliado
packages/
  db/                    # Schema Drizzle compartilhado
  shared/                # Tipos TypeScript compartilhados
deploy/
  docker-compose.dev.yml
  docker-compose.prod.yml
```

## Documentação

- [Deploy](docs/DEPLOY.md)
- [Desenvolvimento](docs/DEVELOPMENT.md)
- [Renovação de cookie](docs/COOKIE_RENEWAL.md)
- [Arquitetura](docs/ARCHITECTURE.md)
