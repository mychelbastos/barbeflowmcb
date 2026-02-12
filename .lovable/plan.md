

# Corrigir configuracao de JWT nas Edge Functions

## Problema

O arquivo `supabase/config.toml` so lista 4 funcoes com `verify_jwt = false`. As demais funcoes -- incluindo `mp-webhook` -- usam o comportamento padrao que exige JWT valido. Como o Mercado Pago envia webhooks sem JWT, as chamadas sao rejeitadas com **401**.

### Situacao atual do config.toml

```text
Configuradas (verify_jwt = false):
  - generate-cover
  - mp-create-subscription
  - mp-cancel-subscription
  - mp-pause-subscription

NAO configuradas (rejeitam chamadas sem JWT):
  - mp-webhook              <-- CAUSA DO PROBLEMA
  - mp-create-checkout
  - mp-oauth-callback
  - mp-oauth-start
  - mp-process-payment
  - mp-get-public-key
  - mp-disconnect
  - whatsapp-webhook
  - create-booking
  - get-available-slots
  - public-customer-bookings
  - send-whatsapp-notification
  - send-booking-reminders
  - auto-complete-bookings
  - expire-pending-bookings
  - process-recurring-bookings
  - wa-booking-engine
  - whatsapp-send-message
  - evolution-*
```

## Correcao

### Arquivo: `supabase/config.toml`

Adicionar `verify_jwt = false` para TODAS as Edge Functions do projeto. Conforme a arquitetura ja documentada do projeto, todas as funcoes usam `verify_jwt = false` e tratam autenticacao internamente quando necessario.

Funcoes que serao adicionadas ao config.toml:

- `mp-webhook` -- recebe webhooks do Mercado Pago (causa raiz do problema)
- `mp-create-checkout` -- chamado pelo frontend publico
- `mp-oauth-callback` -- callback OAuth do MP
- `mp-oauth-start` -- inicio do fluxo OAuth
- `mp-process-payment` -- processamento de pagamentos
- `mp-get-public-key` -- chave publica MP
- `mp-disconnect` -- desconectar MP
- `whatsapp-webhook` -- recebe webhooks do WhatsApp
- `create-booking` -- criacao de agendamentos
- `get-available-slots` -- horarios disponiveis (publico)
- `public-customer-bookings` -- dados do cliente (publico)
- `send-whatsapp-notification` -- envio de notificacoes
- `send-booking-reminders` -- lembretes automaticos
- `auto-complete-bookings` -- completar agendamentos (cron)
- `expire-pending-bookings` -- expirar pendentes (cron)
- `process-recurring-bookings` -- agendamentos recorrentes
- `wa-booking-engine` -- motor de agendamento WhatsApp
- `whatsapp-send-message` -- envio de mensagens WhatsApp
- `evolution-check-status` -- status Evolution API
- `evolution-create-instance` -- criar instancia Evolution
- `evolution-disconnect` -- desconectar Evolution
- `evolution-get-qrcode` -- QR code Evolution
- `evolution-sync-messages` -- sincronizar mensagens

### Impacto

Apenas a alteracao do `config.toml` -- nenhum codigo de funcao precisa ser modificado. Apos o deploy, o Mercado Pago conseguira enviar webhooks com sucesso para processar pagamentos e ativar assinaturas.

