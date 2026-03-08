

# Onboarding Completo — Wizard + Order Bump + Questionário

## Overview

Implementar o fluxo pós-cadastro em 3 partes: order bumps na seleção de plano, questionário de perfil (6 perguntas), e wizard de onboarding (4 passos). O backend já está pronto (tabela `onboarding_progress`, RPCs `save_onboarding_questionnaire`, `skip_onboarding`, `update_onboarding_step`).

---

## Arquivos a Criar

### 1. `src/pages/Questionnaire.tsx`
Tela full-screen com 6 perguntas em sequência (uma por vez, transição suave). Progress dots no topo. Botão "Pular questionário" sempre visível. Ao finalizar, chama `save_onboarding_questionnaire` RPC e navega para `/app/onboarding`. Ao pular, chama `skip_onboarding` e navega para `/app/dashboard`.

### 2. `src/pages/OnboardingWizard.tsx`
Wizard de 4 passos (substitui o conteúdo atual do `Onboarding.tsx` quando o usuário já selecionou plano):
- **Passo 1 (Seu Negócio)**: Editar nome, telefone, endereço, upload de foto. Pré-preenchido do tenant. Salva em `tenants` + chama `update_onboarding_step('profile')`.
- **Passo 2 (Serviços)**: Sugestões rápidas (Corte, Barba, Corte+Barba, Sobrancelha, Hidratação) + formulário manual. Insere em `services` e vincula ao staff owner via `staff_services`. Chama `update_onboarding_step('services')`.
- **Passo 3 (Horários)**: Seleção de horário padrão (início/fim/intervalo) e dias da semana. Cria registros em `schedules` para o staff owner. Chama `update_onboarding_step('schedule')`.
- **Passo 4 (Ferramentas)**: Cards opcionais para conectar MP e WhatsApp (links para config). Chama `update_onboarding_step('payment'/'whatsapp')` se conectado.
- **Tela de Conclusão**: Exibe link de agendamento público, botão copiar, compartilhar WhatsApp, ir para dashboard.

Barra de progresso no topo. Botão "Pular setup" sempre visível (chama `skip_onboarding`, navega para dashboard).

---

## Arquivos a Modificar

### 3. `src/pages/Onboarding.tsx` (Seleção de Plano + Order Bumps)
- Adicionar state para `selectedPlan` (default `'ilimitado'`), `addLoyalty`, `addExtraPro`.
- Tornar os cards de plano clicáveis/selecionáveis (highlight no selecionado).
- Quando `selectedPlan === 'profissional'`, mostrar seção "Turbine seu plano" com 2 checkboxes:
  - Cartão Fidelidade (+R$ 19,90/mês) com nota "Incluso grátis no plano Ilimitado"
  - Profissional Extra (+R$ 14,90/mês) com nota "Ilimitados grátis no plano Ilimitado"
- Resumo visual do total antes do botão de checkout.
- No `handleSubscribe`: salvar `addon_loyalty_requested` e `addon_extra_pro_requested` nos `settings` do tenant antes de redirecionar para Stripe.
- Após retorno do Stripe (checkout completo), redirecionar para `/app/questionnaire` ao invés de dashboard.

### 4. `src/components/AuthWatcher.tsx`
- Após login, buscar `onboarding_progress` do usuário.
- Se `!questionnaire_completed && !onboarding_skipped` → redirecionar para `/app/questionnaire`.
- Se `questionnaire_completed && !onboarding_completed && !onboarding_skipped` → redirecionar para `/app/onboarding-wizard`.
- Se `onboarding_completed || onboarding_skipped` → redirecionar para dashboard (comportamento atual).

### 5. `src/App.tsx`
- Importar e adicionar rotas lazy:
  - `${dashPrefix}/questionnaire` → `Questionnaire` (protected)
  - `${dashPrefix}/onboarding-wizard` → `OnboardingWizard` (protected)
- Manter rota `/onboarding` existente para seleção de plano.

---

## Detalhes Técnicos

### Schedules
A tabela `schedules` usa `weekday` (smallint, 0=domingo..6=sábado), `start_time`/`end_time` (time), `break_start`/`break_end` (time nullable). Um único registro por dia (não precisa dividir em 2 turnos — o intervalo é nativo).

### Staff Owner
O trigger de signup já cria o staff owner (`is_owner = true`). O wizard busca via `staff.is_owner = true AND tenant_id = X`.

### Tenant Info
Pré-preencher nome/telefone do tenant e do owner a partir de `tenants` e `staff` existentes.

### Navegação
- Signup → Onboarding (seleção plano) → Stripe → Questionnaire → OnboardingWizard → Dashboard
- Botão "Pular" em qualquer etapa leva ao dashboard.
- Checagem via `AuthWatcher` garante que ao fazer login, o usuário é redirecionado para a etapa correta.

---

## Estimativa de Complexidade

| Componente | Tamanho |
|---|---|
| Questionnaire.tsx | ~200 linhas |
| OnboardingWizard.tsx | ~500 linhas |
| Onboarding.tsx (modificação) | ~80 linhas adicionadas |
| AuthWatcher.tsx (modificação) | ~30 linhas adicionadas |
| App.tsx (modificação) | ~10 linhas |

