# Chatbot Gabinete Virtual

Estrutura inicial em Python para integrar o chatbot com a WhatsApp Cloud API.

## Stack

- FastAPI para expor o webhook do WhatsApp
- httpx para chamadas à Graph API
- pydantic-settings para configuração por ambiente

## Estrutura

```text
app/
  api/
  models/
  services/
tests/
```

## Configuração

1. Crie um ambiente virtual.
2. Instale as dependências:

```bash
pip install -e .[dev]
```

3. Copie `.env.example` para `.env` e preencha:

- `WHATSAPP_VERIFY_TOKEN`: token usado na validação do webhook
- `WHATSAPP_ACCESS_TOKEN`: token da WhatsApp Cloud API
- `WHATSAPP_PHONE_NUMBER_ID`: identificador do número configurado no Meta
- `WHATSAPP_APP_SECRET`: opcional, habilita verificação da assinatura `X-Hub-Signature-256`

## Execução

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health`: healthcheck
- `GET /webhooks/whatsapp`: verificação do webhook
- `POST /webhooks/whatsapp`: recebimento de eventos do WhatsApp

## Comportamento inicial

- Valida o challenge do webhook
- Recebe mensagens de texto
- Opcionalmente responde em modo eco se `WHATSAPP_ECHO_ENABLED=true`

## Próximos passos

- Persistir sessões e histórico no backend Laravel
- Implementar roteamento de intenções
- Adicionar filas para envio assíncrono e retentativas
