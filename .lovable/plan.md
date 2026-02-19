

## Corrigir Webhook MP e Melhorar Score de Qualidade

### Problema 1: Webhook com 27% de entrega (erros 400/404)

Os logs mostram dois cenários de falha:

**Cenario A**: Mercado Pago envia requisicoes GET para verificar se a URL do webhook esta ativa. O codigo atual tenta fazer `req.json()` em todas as requisicoes que nao sao OPTIONS, causando `SyntaxError: Unexpected end of JSON input`.

**Cenario B**: Pagamentos criados diretamente no painel do MP (nao pelo sistema) chegam ao webhook com `external_reference: null` e `metadata: {}`. O webhook retorna 400, e o MP continua tentando reenviar.

### Problema 2: Score de qualidade - Device ID (acao obrigatoria)

O MP recomenda enviar o identificador do dispositivo (`X-meli-session-id`) nos pagamentos transparentes (`/v1/payments`). Isso requer capturar o device ID no frontend usando o SDK MercadoPago.JS V2 e envia-lo ao `mp-process-payment`.

### Alteracoes

#### 1. `supabase/functions/mp-webhook/index.ts`

Adicionar tratamento para requisicoes GET e para pagamentos sem referencia interna:

- **Antes do `req.json()`** (linha 33): Verificar se o metodo e GET e retornar 200 imediatamente
- **No bloco de pagamentos sem referencia** (linhas 117-121): Retornar status 200 em vez de 400, para que o MP pare de reenviar

```typescript
// ADICIONAR antes da linha 33:
if (req.method === 'GET') {
  return new Response(
    JSON.stringify({ status: 'ok' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Na linha 118-120, TROCAR status 400 por 200:
return new Response(JSON.stringify({ received: true, ignored: true, reason: 'no_internal_reference' }), {
  status: 200,  // <-- era 400
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

#### 2. `supabase/functions/mp-process-payment/index.ts`

Adicionar suporte ao `device_id` recebido do frontend:

- Aceitar campo `device_id` no body da requisicao
- Incluir header `X-meli-session-id` na chamada ao MP

```typescript
// No destructuring do body (linha 23), adicionar:
device_id,

// Na chamada fetch ao MP (linha ~178), adicionar header:
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${mpToken.access_token}`,
  'X-Idempotency-Key': `${booking_id}-${payment_type}-${Date.now()}`,
  ...(device_id ? { 'X-meli-session-id': device_id } : {}),
},
```

#### 3. `src/components/MercadoPagoCheckout.tsx`

Capturar o device ID do SDK e envia-lo junto com o pagamento:

- Apos inicializar o SDK MP, obter o `deviceId` via `window.MP_DEVICE_SESSION_ID` ou `mp.getIdentificationTypes()` (o SDK popula automaticamente)
- Enviar o `device_id` no body da chamada a `mp-process-payment`

### Resumo do impacto

| Alteracao | Impacto |
|---|---|
| GET handler no webhook | Elimina erros de verificacao (SyntaxError) |
| 200 para pagamentos sem referencia | Elimina erros 400 de pagamentos externos |
| Device ID no pagamento transparente | +2 pontos no score MP (acao obrigatoria) |

### Arquivos alterados

| Arquivo | Tipo |
|---|---|
| `supabase/functions/mp-webhook/index.ts` | Alterar (2 pontos) |
| `supabase/functions/mp-process-payment/index.ts` | Alterar (device_id header) |
| `src/components/MercadoPagoCheckout.tsx` | Alterar (capturar e enviar device_id) |

### O que NAO sera alterado

- `mp-create-checkout` - Checkout Pro ja envia items com todos os campos recomendados (id, title, quantity, unit_price, category_id, description)
- `mp-process-payment` - ja envia `additional_info.items` com category_id, description, quantity, unit_price
- Nenhum dado existente sera perdido

