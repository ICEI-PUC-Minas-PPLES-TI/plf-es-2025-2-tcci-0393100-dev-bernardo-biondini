[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=20840370)

# Gabinete Virtual

O objetivo deste projeto é desenvolver o sistema  **Gabinete Virtual** , uma plataforma web destinada a centralizar e organizar os processos internos de um gabinete parlamentar. A solução integra o registro e acompanhamento de demandas, gestão de instituições e lideranças, controle de emendas e projetos de lei, administração da agenda e publicação de conteúdo institucional, permitindo que a equipe trabalhe de forma estruturada, transparente e eficiente. Ao consolidar informações antes dispersas em planilhas e mensagens, o sistema oferece suporte à tomada de decisão e melhora a comunicação entre equipe, cidadãos e representantes públicos.

## Alunos integrantes da equipe

* Bernardo Cavanellas Biondini

## Professores responsáveis

* **Cleiton Silva Tavares**
* **Danilo de Quadros Maia**
* **Leonardo Vilela Cardoso**
* **Raphael Ramos Dias Costa**
* **Marco Rodrigo Costa**

## Estrutura do repositório

- `Codigo/backend-gabinete-virtual`: API principal em Laravel
- `Codigo/frontend-gabinete-virtual`: painel web em React + Vite
- `Codigo/chatbot-gabinete-virtual`: serviço do chatbot em FastAPI, integrado ao WhatsApp e ao backend
- `Documentacao`, `Artefatos` e `Divulgacao`: materiais acadêmicos do projeto

## Pré-requisitos

- Docker e Docker Compose
- Node.js 20+
- Python 3.11+

## Execução local

### 1. Backend

O backend foi preparado para rodar com Docker. Os comandos PHP devem ser executados no contêiner.

```bash
cd Codigo/backend-gabinete-virtual
cp .env.example .env  # se o arquivo existir no seu ambiente
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate --seed
docker compose exec app npm install
docker compose exec app npm run build
```

Após a inicialização, a API ficará disponível em `http://localhost:8000`.

Se quiser acompanhar filas e recursos em modo de desenvolvimento:

```bash
cd Codigo/backend-gabinete-virtual
docker compose exec app php artisan queue:work
```

### 2. Frontend

```bash
cd Codigo/frontend-gabinete-virtual
npm install
npm run dev
```

O frontend ficará disponível em `http://localhost:3000`.

Variáveis úteis:

- `VITE_API_URL`: URL base da API. Padrão: `http://localhost:8000/api`
- `VITE_CHATBOT_URL`: URL base do serviço do chatbot. Padrão: `http://localhost:8001`

Se o Vite falhar com erro de limite de watchers (`ENOSPC`), use:

```bash
npm run dev:polling
```

### 3. Chatbot

```bash
cd Codigo/chatbot-gabinete-virtual
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
```

Crie ou ajuste o arquivo `.env` do chatbot com as variáveis principais:

- `APP_PORT=8001`
- `BACKEND_API_URL=http://localhost:8000`
- `BACKEND_API_TOKEN=...`
- `INTERNAL_API_TOKEN=...`
- `WHATSAPP_VERIFY_TOKEN=...`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_BUSINESS_ACCOUNT_ID=...`
- `WHATSAPP_APP_SECRET=...`

Em seguida, rode:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

O serviço ficará disponível em `http://localhost:8001`.

## Fluxo integrado

Para o ambiente local completo:

1. Suba o backend com Docker.
2. Rode o frontend em `localhost:3000`.
3. Rode o chatbot em `localhost:8001`.
4. Configure no backend a URL do chatbot via `CHATBOT_SERVICE_URL=http://localhost:8001`.
5. Garanta que `CHATBOT_INTERNAL_TOKEN` no backend e `INTERNAL_API_TOKEN` no chatbot estejam sincronizados.

Com isso, o sistema suporta:

- gestão de demandas, emendas, projetos de lei, agenda e CMS
- validação de demandas enviadas pelo chatbot
- alertas internos e notificações em tempo real via WebSocket
- integração com a API do WhatsApp para testes e operação do chatbot

## Testes

### Backend

```bash
cd Codigo/backend-gabinete-virtual
docker compose exec app php artisan test
```

### Frontend

```bash
cd Codigo/frontend-gabinete-virtual
npm run lint
npm run build
```

### Chatbot

```bash
cd Codigo/chatbot-gabinete-virtual
source .venv/bin/activate
pytest
```
