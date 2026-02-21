

# Cobrança por Profissional Adicional via Stripe

## Visao Geral

Implementar a cobranca automatica de R$24,90/mes por profissional ativo alem do 1o incluso no plano. O admin recebe uma confirmacao antes de qualquer alteracao na assinatura.

---

## Passo 1 -- Criar Produto/Preco no Stripe

Criar via ferramentas do Stripe:
- **Produto**: "Profissional Adicional"
- **Preco**: R$24,90/mes (2490 centavos BRL), recorrente mensal
- Guardar o `price_id` resultante como constante no codigo

---

## Passo 2 -- Edge Function: `update-subscription-quantity`

Nova edge function que:
1. Autentica o usuario e identifica o tenant
2. Busca a assinatura ativa no Stripe (via `stripe_customers`)
3. Recebe o numero de profissionais extras desejado (`additional_count`)
4. Usa `stripe.subscriptions.update()` para adicionar/atualizar o item de preco de profissional adicional com `quantity = additional_count`
5. Se `additional_count === 0`, remove o item
6. Atualiza `stripe_subscriptions.additional_professionals` no banco

---

## Passo 3 -- Frontend: Confirmacao ao Cadastrar/Ativar Profissional

Na pagina **Staff** (`src/pages/Staff.tsx`):

1. Ao salvar ou ativar um profissional, antes de confirmar:
   - Contar quantos profissionais ativos o tenant tera apos a acao
   - Se ultrapassar 1 (o incluso), exibir um `AlertDialog`:
     - "Voce tera X profissionais ativos. Isso adicionara R$24,90/mes por Y profissional(is) extra(s) na sua assinatura. Deseja continuar?"
   - Se confirmar: salva o profissional e chama `update-subscription-quantity` com a nova contagem
   - Se cancelar: nao salva

2. Ao **desativar/excluir** um profissional:
   - Recalcular os extras e chamar `update-subscription-quantity` para reduzir

---

## Passo 4 -- Webhook: Sincronizar `additional_professionals`

No `stripe-webhook/index.ts`, nos eventos `customer.subscription.updated`:
- Verificar se existe um item com o price_id de profissional adicional
- Salvar a `quantity` em `stripe_subscriptions.additional_professionals`

---

## Passo 5 -- BillingTab: Exibir Profissionais Extras

No `BillingTab.tsx`, quando a assinatura estiver ativa:
- Buscar `additional_professionals` da tabela `stripe_subscriptions`
- Exibir: "X profissional(is) adicional(is) -- +R$ XX,XX/mes"
- Incluir no valor total exibido da proxima cobranca

---

## Passo 6 -- Onboarding/Landing: Manter Texto Atual

O texto "+R$24,90/mes por profissional adicional" ja existe. Nenhuma alteracao necessaria.

---

## Detalhes Tecnicos

### Stripe Subscription com Multiplos Itens

A assinatura tera 2 line items:
1. Plano base (Essencial ou Profissional) -- quantity: 1
2. Profissional adicional -- quantity: N (0 a muitos)

O Stripe calcula automaticamente o prorate ao alterar quantidades mid-cycle.

### Fluxo no `create-checkout`

No checkout inicial, nao incluir o item de profissional adicional (o tenant comeca com 0 extras). O item sera adicionado depois via `update-subscription-quantity` conforme profissionais sao cadastrados.

### Mapeamento de Precos

Adicionar ao `useSubscription.ts` e nas edge functions:
```
STRIPE_PRICE_ADDITIONAL_PROFESSIONAL = "price_xxx" (a ser criado)
```

Armazenar como secret do Supabase (`STRIPE_PRICE_ADDITIONAL_PROFESSIONAL`) para flexibilidade.

### Protecao contra estados inconsistentes

- Se o tenant nao tiver assinatura ativa, o cadastro de profissionais continua funcionando normalmente (sem cobrar extras)
- A cobranca so se aplica a tenants com assinatura Stripe ativa
- Se a atualizacao no Stripe falhar, reverter a ativacao do profissional e mostrar erro

