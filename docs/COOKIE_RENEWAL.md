# Como renovar o cookie do Link Builder

O cookie expira periodicamente. Quando o dashboard mostrar "Cookie expirado",
siga este tutorial para renovar.

---

## Passo a passo

### 1. Acessar o Link Builder

Abra: `https://www.mercadolivre.com.br/afiliados/link-builder`

Faça login com sua conta de afiliado se necessário.

### 2. Abrir o DevTools

Pressione **F12** (ou Cmd+Option+I no Mac) → aba **Network**.

### 3. Gerar um link de teste

- Cole qualquer URL de produto ML no campo, ex:  
  `https://www.mercadolivre.com.br/notebook-gamer/p/MLB1234567890`
- Clique em **Gerar link**

### 4. Localizar o request da API

Na aba Network, filtre por:
- Palavra-chave: `link` ou `affiliate` ou `create`
- Método: `POST`

Procure um request para um endpoint interno do tipo `/affiliate-program/...` ou similar.

### 5. Copiar o cookie

**Opção A — via cURL:**
1. Right-click no request → **Copy → Copy as cURL**
2. No texto copiado, localize `-H 'Cookie: ...'`
3. Copie o valor inteiro do header Cookie

**Opção B — via Headers:**
1. Clique no request
2. Aba **Headers** → seção **Request Headers**
3. Copie o valor do header `Cookie`

> O cookie começa geralmente com `c_u_id=...` ou `JSESSIONID=...`

### 6. Configurar no dashboard

1. Acesse `https://ml.cotec.net.br/configuracoes/link-builder`
2. Cole o cookie no campo **Cookie de sessão**
3. Confirme a tag de afiliado
4. Clique em **Salvar cookie**

### 7. Testar

Após salvar, o worker tentará gerar um link na próxima execução (até 60s).
Verifique o status na mesma página — deve aparecer "Cookie ativo".

---

## Frequência de renovação

O cookie expira em geral a cada **7–30 dias** (varia conforme atividade).
Configure um lembrete para verificar semanalmente.

## Segurança

- O cookie é armazenado em texto plano no banco de dados (Fase 1).
- Não compartilhe o cookie — ele dá acesso à sua conta de afiliado.
- Em caso de suspeita de comprometimento, revogue a sessão no ML e renove.
