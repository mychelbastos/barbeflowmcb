

## Correção: start_date rejeitado como "past date" pelo Mercado Pago

### Problema
O `new Date().toISOString()` gera um timestamp do momento exato da execução. Quando a requisição chega ao Mercado Pago (alguns segundos depois), esse timestamp já está no passado, causando o erro 400: `"cannot be a past date"`.

### Solução
Adicionar uma margem de segurança de 5 minutos ao `start_date`, garantindo que nunca seja interpretado como passado pelo MP.

### Alteracao

**Arquivo:** `supabase/functions/mp-create-subscription/index.ts`

Trocar:
```typescript
start_date: new Date().toISOString(),
```

Por:
```typescript
start_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
```

Isso adiciona 5 minutos ao horario atual, evitando a rejeicao do MP sem afetar a cobranca imediata (o MP ainda processa o primeiro pagamento dentro do ciclo atual).

### Escopo
- Alteracao de uma unica linha
- Redeploy da Edge Function `mp-create-subscription`
