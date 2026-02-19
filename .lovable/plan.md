

## Corrigir redirect do OAuth do Mercado Pago

### Problema

O `mp-oauth-callback` redireciona para `https://www.modogestor.com.br/app/settings?mp_connected=1`, mas:
- `www.modogestor.com.br` e o dominio **publico** (landing, agendamento) - nao tem rota `/app/settings`
- O dashboard fica em `app.modogestor.com.br`, onde as rotas **nao usam** o prefixo `/app`
- A URL correta e: `https://app.modogestor.com.br/settings?mp_connected=1`

### Solucao

Alterar o `mp-oauth-callback` para redirecionar para o dominio do dashboard (`app.modogestor.com.br`) com a rota sem o prefixo `/app`.

### Alteracoes

**`supabase/functions/mp-oauth-callback/index.ts`**:
- Trocar todas as URLs de redirect de `${frontBaseUrl}/app/settings` para usar o dominio do dashboard
- Usar uma variavel separada ou hardcoded `https://app.modogestor.com.br/settings` para os redirects
- Manter o fallback defensivo (protocolo, barra final)

Redirects a corrigir (6 ocorrencias no arquivo):
1. `?mp_error=missing_params`
2. `?mp_error=invalid_state`
3. `?mp_error=expired`
4. `?mp_error=config_error`
5. `?mp_error=token_exchange_failed`
6. `?mp_error=no_token`
7. `?mp_error=db_error`
8. `?mp_connected=1` (sucesso)
9. `?mp_error=server_error` (catch)

Todas devem apontar para `https://app.modogestor.com.br/settings?...`

### Secao tecnica

A abordagem mais limpa e usar um secret ou constante dedicada ao dashboard. Como o `FRONT_BASE_URL` e usado por outras funcoes para o dominio publico, vamos usar diretamente `https://app.modogestor.com.br` como base do redirect no callback, ja que o destino e sempre o painel administrativo.

```text
Antes:  https://www.modogestor.com.br/app/settings?mp_connected=1  (404)
Depois: https://app.modogestor.com.br/settings?mp_connected=1     (correto)
```

Apos a alteracao, a edge function sera redeployada automaticamente.
