
# Dominio Personalizado (White Label) - Plano Profissional

## Resumo
Criar uma aba "Dominio" nas Configuracoes onde barbeiros do plano Profissional podem conectar seu proprio dominio (ex: barbeariadoze.com.br) via Cloudflare for SaaS. Usuarios do plano Essencial verao uma tela de upsell com CTA para upgrade.

---

## Etapa 1: Secrets do Cloudflare

Antes de qualquer codigo, precisamos adicionar dois secrets:
- `CLOUDFLARE_API_TOKEN` - Token da API Cloudflare com permissao "Zone: Edit"
- `CLOUDFLARE_ZONE_ID` - ID da zona no Cloudflare onde o SaaS esta configurado

Voce precisara fornecer esses valores apos ativar o "Cloudflare for SaaS" no painel.

---

## Etapa 2: Migracao do Banco de Dados

Adicionar 3 colunas na tabela `tenants`:

```sql
ALTER TABLE tenants
  ADD COLUMN custom_domain text UNIQUE,
  ADD COLUMN cloudflare_status text DEFAULT 'none',
  ADD COLUMN cloudflare_hostname_id text;
```

- `custom_domain`: dominio do cliente (ex: barbeariadoze.com.br)
- `cloudflare_status`: 'none', 'pending', 'active', 'error'
- `cloudflare_hostname_id`: ID retornado pela Cloudflare para gerenciamento

---

## Etapa 3: Edge Function `add-custom-domain`

Nova edge function que:
1. Valida autenticacao do usuario
2. Verifica se o plano e "profissional" (via `stripe_subscriptions`)
3. Chama `POST /zones/:zone_id/custom_hostnames` na API Cloudflare
4. Salva o `hostname_id` e os registros DNS de validacao na tabela `tenants`
5. Retorna os registros CNAME/TXT que o usuario precisa configurar

---

## Etapa 4: Edge Function `check-domain-status`

Nova edge function que:
1. Busca o `cloudflare_hostname_id` do tenant
2. Chama `GET /zones/:zone_id/custom_hostnames/:id` na Cloudflare
3. Atualiza `cloudflare_status` no banco
4. Retorna o status atual

---

## Etapa 5: Edge Function `remove-custom-domain`

Nova edge function para desconectar:
1. Chama `DELETE /zones/:zone_id/custom_hostnames/:id` na Cloudflare
2. Limpa `custom_domain`, `cloudflare_status`, `cloudflare_hostname_id` no banco

---

## Etapa 6: Componente `CustomDomainTab`

Novo componente `src/components/settings/CustomDomainTab.tsx`:

**Se plano != profissional:**
- Card com icone de cadeado
- Titulo: "Sua marca em primeiro lugar."
- Texto: "Nao divulgue o nosso link. Tenha o seu proprio site (www.suabarbearia.com.br) e passe mais credibilidade."
- Botao: "Quero fazer Upgrade" → navega para aba billing

**Se plano == profissional e sem dominio:**
- Input para digitar dominio (com validacao: sem protocolo, sem path)
- Botao "Conectar Dominio"
- Instrucoes claras sobre o que digitar

**Se plano == profissional e dominio pendente:**
- Badge "Verificando..." (amarelo)
- Card com registros DNS em bloco de codigo com botao "Copiar"
  - CNAME record
  - TXT record para validacao
- Botao "Verificar Status" para polling manual
- Botao "Remover Dominio"

**Se plano == profissional e dominio ativo:**
- Badge "Ativo" (verde) com checkmark
- Dominio exibido com link
- Botao "Remover Dominio"

---

## Etapa 7: Integrar Tab nas Configuracoes

Em `Settings.tsx`:
- Adicionar nova aba "Dominio" com icone `Globe`
- Renderizar `<CustomDomainTab />` condicionalmente
- Importar `useSubscription` para verificacao de plano

---

## Etapa 8: Roteamento de Dominios Custom

Atualizar `src/lib/hostname.ts`:
- Adicionar logica para reconhecer dominios customizados (que nao sao os dominios conhecidos)
- Tratar dominios custom como dominio publico, buscando o tenant pelo `custom_domain` no banco

Atualizar `BookingPublic.tsx`:
- Quando acessado via dominio custom, buscar tenant por `custom_domain` ao inves de slug na URL

---

## Arquivos Envolvidos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/` | Nova migracao (3 colunas em tenants) |
| `supabase/functions/add-custom-domain/index.ts` | Criar |
| `supabase/functions/check-domain-status/index.ts` | Criar |
| `supabase/functions/remove-custom-domain/index.ts` | Criar |
| `supabase/config.toml` | Registrar 3 novas functions |
| `src/components/settings/CustomDomainTab.tsx` | Criar |
| `src/pages/Settings.tsx` | Adicionar aba "Dominio" |
| `src/lib/hostname.ts` | Reconhecer dominios custom |
| `src/pages/BookingPublic.tsx` | Resolver tenant por dominio custom |

---

## Pre-requisitos (Sua parte)

1. **Ativar Cloudflare for SaaS** no painel Cloudflare (SSL/TLS → Custom Hostnames)
2. Configurar o **Fallback Origin** (ex: `barberflow.store`)
3. Criar **API Token** com permissao de Custom Hostnames
4. Fornecer `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ZONE_ID` quando solicitado
