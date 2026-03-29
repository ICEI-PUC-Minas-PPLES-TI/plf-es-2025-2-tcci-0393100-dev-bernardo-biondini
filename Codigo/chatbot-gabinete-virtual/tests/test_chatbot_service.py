from app.config import Settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.chatbot import ChatbotService


class FakeWhatsAppClient:
    async def send_text_message(self, to: str, body: str) -> dict[str, str]:
        return {"to": to, "body": body}


class FakeBackendApiClient:
    def __init__(self) -> None:
        self.created_payload: dict | None = None

    async def get_demand_options(self) -> dict:
        return {
            "cities": [
                {"id": 1, "name": "Belo Horizonte", "region": "Centro"},
            ],
            "institutions": [
                {"id": 10, "name": "Prefeitura de Belo Horizonte", "type": "Prefeitura", "city_id": 1},
            ],
        }

    async def create_demand(self, payload: dict) -> dict:
        self.created_payload = payload
        return {"id": 123}


async def _reply(service: ChatbotService, sender: str, text: str) -> str:
    return await service.build_reply(
        IncomingWhatsAppMessage(
            sender=sender,
            message_id=f"msg-{text}",
            text=text,
        )
    )


async def test_chatbot_opens_demand_flow() -> None:
    backend_client = FakeBackendApiClient()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
    )

    sender = "31999999999"

    assert "1 - Abrir demanda" in await _reply(service, sender, "oi")
    assert "nome completo" in await _reply(service, sender, "1")
    assert "titulo curto" in await _reply(service, sender, "Maria Silva")
    assert "explique um pouco melhor" in await _reply(service, sender, "Falta de atendimento")
    assert "Informe o nome da cidade" in await _reply(
        service,
        sender,
        "Preciso de ajuda com atendimento de saude no meu bairro.",
    )
    assert "Cidade selecionada" in await _reply(service, sender, "Belo Horizonte")
    confirmation = await _reply(
        service,
        sender,
        "Prefeitura de Belo Horizonte",
    )
    assert "A definir pelo gestor" in confirmation
    assert "Status inicial: Em analise" in confirmation

    final_reply = await _reply(service, sender, "1")

    assert "Demanda aberta com sucesso" in final_reply
    assert backend_client.created_payload == {
        "citizen_name": "Maria Silva",
        "phone": sender,
        "title": "Falta de atendimento",
        "description": "Preciso de ajuda com atendimento de saude no meu bairro.",
        "priority": None,
        "city_id": 1,
        "institution_id": 10,
    }
