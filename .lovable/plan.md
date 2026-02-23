

# Novos recursos na Landing Page e nos Planos

## Resumo
Adicionar 3 novos recursos na lista de features dos planos e criar 3 novas seções visuais dedicadas na Landing Page.

---

## Parte 1 — Adicionar aos planos (bullets nos cards)

No arquivo `src/hooks/useSubscription.ts`, adicionar ao array `SHARED_FEATURES`:

- "Caixa e controle financeiro diário"
- "Comissões automáticas por profissional"
- "App instalável no celular (PWA)"

Isso fará com que apareçam automaticamente nos 3 cards de preço da Landing e no BillingTab.

---

## Parte 2 — 3 novas seções na Landing Page

Serão inseridas **antes da seção de Preços** no arquivo `src/pages/Landing.tsx`.

### Seção 1: Caixa Financeiro
- Titulo: "Controle total do seu caixa"
- Subtitulo: explicar abertura/fechamento, entradas e saidas, separacao por metodo de pagamento
- Layout visual com icones representando o fluxo (abrir caixa, registrar, fechar, relatorio)
- Destaque: "Pagamentos online aparecem automaticamente no caixa"

### Seção 2: Comissoes Automaticas
- Titulo: "Comissoes calculadas automaticamente"
- Subtitulo: explicar que cada agendamento gera snapshot de comissao por profissional
- Layout com icones mostrando: servico realizado, calculo automatico, relatorio por profissional
- Destaque: "Sem planilhas. Sem erros."

### Seção 3: App no Celular (PWA)
- Titulo: "Seu negocio no bolso"
- Subtitulo: instalar direto do navegador, sem loja de apps
- Layout com mockup mobile ou icone de celular
- Destaque: "Funciona offline e abre instantaneamente"

---

## Detalhes tecnicos

### Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useSubscription.ts` | Adicionar 3 items ao `SHARED_FEATURES` |
| `src/pages/Landing.tsx` | Inserir 3 novas secoes animadas antes de `#precos` |

### Padrao visual
As novas secoes seguirao o mesmo padrao das secoes existentes na Landing:
- `motion.div` com `initial/whileInView` para animacao fade-up
- Fundo `py-28 px-6 border-t border-zinc-800/30`
- Icones do `lucide-react` (Wallet, Calculator, Smartphone)
- Grid responsivo com cards ou bullets

### Ordem das secoes na Landing (resultado final)
1. Hero
2. Social proof
3. Features grid
4. Clube de Assinaturas
5. Experiencia mobile (Netflix cards)
6. **Caixa Financeiro** (novo)
7. **Comissoes Automaticas** (novo)
8. **App no Celular** (novo)
9. Depoimentos
10. Precos
11. Como funciona
12. FAQ
13. Footer

