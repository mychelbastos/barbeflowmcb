
# Order Bump — Recomendacoes de Produtos no Agendamento Publico

## Conceito
Quando o cliente seleciona um servico e chega na etapa de dados pessoais (step 5), o sistema exibe uma secao de "Adicione ao seu atendimento" com produtos recomendados que o dono configurou para aquele servico. O cliente marca os que deseja e eles sao salvos como `booking_items` do tipo `product` apos a criacao do booking.

---

## Arquitetura

### 1. Nova tabela: `service_order_bumps`
Relaciona servicos a produtos recomendados, com ordem de exibicao.

```text
service_order_bumps
- id            uuid PK
- tenant_id     uuid NOT NULL
- service_id    uuid NOT NULL (FK services)
- product_id    uuid NOT NULL (FK products)
- sort_order    integer DEFAULT 0
- active        boolean DEFAULT true
- created_at    timestamptz DEFAULT now()

UNIQUE(service_id, product_id)
RLS: tenant scope (user_belongs_to_tenant)
```

### 2. Tela de configuracao (Admin)
No arquivo `src/pages/Services.tsx`, dentro do dialog de editar servico, adicionar uma nova secao "Order Bump" que permite:
- Buscar e vincular produtos ativos ao servico
- Reordenar e remover produtos vinculados
- Toggle ativo/inativo por vinculo

### 3. Fluxo publico (BookingPublic.tsx)
- Apos o cliente selecionar o servico (step 1), buscar os order bumps ativos: `service_order_bumps` JOIN `products` WHERE `service_id` = selecionado
- Na step 5 (dados pessoais), exibir uma secao visual **antes** do botao de confirmar:
  - Titulo: "Aproveite e adicione"
  - Cards de produto com foto, nome, preco e checkbox
  - Total atualizado dinamicamente (servico + produtos selecionados)
- Os produtos selecionados sao enviados no body do `create-booking` como `order_bump_items`

### 4. Backend (create-booking Edge Function)
- Aceitar campo opcional `order_bump_items: Array<{product_id, quantity}>` no request
- Apos criar o booking, inserir os itens na tabela `booking_items` com:
  - `type: 'product'`
  - `ref_id: product_id`
  - `paid_status: 'unpaid'` (serao cobrados na comanda ou junto ao pagamento online)
  - `staff_id: booking.staff_id`
  - `purchase_price_cents` do produto (para calculo de margem)

---

## Detalhes tecnicos

### Arquivos modificados/criados

| Arquivo | Alteracao |
|---|---|
| **Migration SQL** | Criar tabela `service_order_bumps` com RLS |
| `src/pages/Services.tsx` | Secao de configuracao de order bumps no dialog de edicao |
| `src/pages/BookingPublic.tsx` | Buscar bumps ao selecionar servico, exibir na step 5, enviar no submit |
| `supabase/functions/create-booking/index.ts` | Aceitar `order_bump_items`, inserir em `booking_items` apos criacao |

### Fluxo do cliente (visual)

```text
Step 1: Seleciona servico
  -> Sistema busca order bumps do servico
Step 2: Seleciona profissional
Step 3: Seleciona data/hora
Step 4: Forma de pagamento (se aplicavel)
Step 5: Dados pessoais + SECAO ORDER BUMP
  -> Cards com checkbox, foto, nome, preco
  -> "Total: R$ X (servico) + R$ Y (produtos)"
Step 6: Confirmacao
```

### Secao de Order Bump (UI publica)
- Estilo consistente com o restante do BookingPublic (zinc-900, border-zinc-800)
- Cada produto: card horizontal com imagem 48x48, nome, preco e checkbox
- Animacao de entrada suave
- Resumo do total atualizado abaixo

### Secao de configuracao (Admin)
- Dentro do dialog de edicao de servico, nova aba/secao "Order Bumps"
- Lista de produtos vinculados com botao de remover
- Combobox para buscar e adicionar novos produtos
- Reutilizar padrao visual do `ExtraItemsSection` (Command + Popover)

### Integracao com Comanda
Os itens de order bump aparecerao automaticamente na comanda (`BookingDetailsModal`) pois ja serao `booking_items` do tipo `product`. O fluxo de pagamento local e fechamento funciona sem alteracoes.
