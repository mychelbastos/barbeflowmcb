

## Permitir cadastro com telefone duplicado (com aviso)

Casos como pai e filho compartilhando o mesmo telefone sao comuns. A solucao sera **remover a restricao unica do banco** e **adicionar um aviso no frontend** antes de confirmar o cadastro.

### O que muda

1. **Banco de dados** -- Remover o indice unico `idx_customers_phone_tenant` que impede dois clientes com o mesmo telefone no mesmo tenant. Isso elimina o erro de constraint.

2. **Validacao no cadastro (`handleAddCustomer`)** -- Antes de inserir, fazer uma query no banco buscando clientes com o mesmo telefone normalizado no tenant. Se encontrar, exibir um `AlertDialog` informando:
   - "Ja existe(m) cliente(s) com este telefone: **Nome do cliente**"
   - Botao "Cancelar" -- fecha o dialog
   - Botao "Cadastrar mesmo assim" -- prossegue com a insercao normalmente

3. **Validacao na edicao (`handleSaveEdit`)** -- Mesma logica: ao alterar o telefone, verificar se outro cliente ja usa aquele numero e avisar antes de salvar.

4. **Remover a funcao `isCustomerDuplicate` local** -- Substituir pela consulta direta no banco (mais confiavel que verificar apenas clientes paginados na tela).

---

### Detalhes tecnicos

**Migracao SQL:**
```sql
DROP INDEX IF EXISTS idx_customers_phone_tenant;
```

**Novos estados em `src/pages/Customers.tsx`:**
- `showDuplicateWarning: boolean` -- controla o AlertDialog
- `duplicateNames: string` -- nomes dos clientes encontrados
- `pendingAction: 'add' | 'edit'` -- qual acao executar apos confirmacao

**Fluxo no `handleAddCustomer`:**
1. Normaliza telefone
2. Query: `supabase.from('customers').select('name').eq('tenant_id', tenantId).eq('phone', normalizedPhone)`
3. Se encontrar resultados: abre AlertDialog com os nomes
4. Se usuario confirmar: executa o insert
5. Se nao encontrar: executa o insert direto

**Arquivo modificado:** apenas `src/pages/Customers.tsx` (+ migracao SQL)

