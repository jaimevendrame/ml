# OfertaML

[![CI](https://github.com/jaimevendrame/ml/actions/workflows/ci.yml/badge.svg)](https://github.com/jaimevendrame/ml/actions/workflows/ci.yml)

Sistema de gerenciamento de ofertas do Mercado Livre para publicação automática em grupos de WhatsApp.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend + API | Next.js 15 · TypeScript · Tailwind CSS |
| Auth | Better Auth (email + senha, single-tenant) |
| Banco | Postgres 16 · Drizzle ORM |
| WhatsApp | Go + whatsmeow |
| Scraper | Node.js + Playwright |
| Link afiliado | Node.js worker (cookie ML) |
| Infra | Docker Compose · Traefik · Portainer · GHCR |

## Setup local (3 comandos)

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir Postgres dev
pnpm db:up && pnpm db:migrate

# 3. Iniciar dashboard
cd apps/web && cp ../../deploy/.env.example .env.local && pnpm dev
```

> Requisitos: Node 20+, pnpm 10+, Docker, Go 1.23+

## Estrutura

```
apps/
  web/                    Next.js — dashboard e API principal
  whatsapp-service/       Go — integração WhatsApp (whatsmeow)
  scraper-service/        Node + Playwright — coleta de item IDs
  link-builder-worker/    Node — geração de links de afiliado
packages/
  db/                     Schema Drizzle compartilhado
deploy/
  docker-compose.dev.yml  Postgres dev local
  docker-compose.prod.yml Stack de produção (Portainer)
```

## Scripts principais

```bash
pnpm db:up        # sobe Postgres dev
pnpm db:down      # para Postgres dev
pnpm db:migrate   # aplica migrations
pnpm db:studio    # abre Drizzle Studio
pnpm typecheck    # TypeScript em todos os pacotes
```

## Fluxo de dados

```
Scraper (Playwright) → item IDs
  → ML API /items/{id} → enriquecimento
  → Link Builder (cookie ML) → link afiliado
  → Dashboard → publicação no grupo WhatsApp
```

## Documentação

- [Deploy no Portainer](docs/DEPLOY.md)
- [Renovação de cookie Link Builder](docs/COOKIE_RENEWAL.md)
- [Plano da Fase 1](docs/PHASE_1_PLAN.md)

## Variáveis de ambiente

Copie `deploy/.env.example` para `apps/web/.env.local` e preencha.  
Para produção, use `deploy/.env.example.prod` como referência.
