# Deploy — OfertaML

## Pré-requisitos

- Portainer rodando em `portal.cotec.net.br`
- Traefik com network Docker `network_public`
- Repositório criado: `jaimevendrame/ml` (privado)
- Secret `PORTAINER_WEBHOOK_URL` configurado no GitHub

---

## 1. Criar a Stack no Portainer

1. Acesse Portainer → **Stacks → Add stack**
2. Nome da stack: `ofertaml`
3. Build method: **Repository**
4. URL: `https://github.com/jaimevendrame/ml`
5. Compose path: `deploy/docker-compose.prod.yml`
6. Clique em **Deploy the stack**

---

## 2. Variáveis de ambiente

No painel da stack, preencha as variáveis conforme `deploy/.env.example.prod`:

| Variável | Valor |
|---|---|
| `DOMAIN` | `ml.cotec.net.br` |
| `POSTGRES_PASSWORD` | Senha forte (gere com `openssl rand -base64 24`) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `https://ml.cotec.net.br` |
| `INTERNAL_SERVICE_TOKEN` | `openssl rand -hex 32` |
| `ML_AFFILIATE_TAG` | Sua tag de afiliado ML |
| `GHCR_IMAGE_TAG` | `latest` (ou SHA específico para rollback) |

---

## 3. Configurar o webhook do Portainer

1. Na stack criada → **Stack webhooks**
2. Copie a URL do webhook gerada
3. No GitHub → **Settings → Secrets → Actions**
4. Crie o secret `PORTAINER_WEBHOOK_URL` com a URL copiada

---

## 4. Rodar migrations após primeiro deploy

```bash
docker exec ofertaml_web pnpm db:migrate
```

---

## 5. Criar primeiro usuário admin

Acesse `https://ml.cotec.net.br/signup` logo após o primeiro deploy.  
Após criar, o signup fica disponível mas o sistema é single-tenant.

---

## 6. Verificar logs no Portainer

Portainer → Stacks → ofertaml → clique no serviço → **Logs**

Ou via CLI:
```bash
docker logs ofertaml_web --tail 50 -f
docker logs ofertaml_whatsapp --tail 50 -f
docker logs ofertaml_link-builder --tail 50 -f
```

---

## 7. Rollback

1. Altere `GHCR_IMAGE_TAG` para o SHA do commit anterior
2. Clique em **Update the stack** no Portainer

Ou via webhook:
```bash
curl -X POST "$PORTAINER_WEBHOOK_URL"
```

---

## 8. Verificar backup

```bash
docker exec ofertaml_postgres-backup ls -la /backups/last/
```

---

## 9. Restaurar backup

```bash
docker exec -i ofertaml_postgres psql -U ofertaml -d ofertaml < backup.sql
```
