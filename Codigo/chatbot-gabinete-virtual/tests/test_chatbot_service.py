import asyncio

import pytest

from app.config import Settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.chatbot import ChatbotService
from app.services.demand_validation import (
    AggressiveToneDetectedError,
    HateSpeechDetectedError,
    InvalidLanguageError,
    ProfanityDetectedError,
    SimilarDemandFoundError,
)
from app.services.whatsapp import WhatsAppApiError


class FakeWhatsAppClient:
    async def send_text_message(self, to: str, body: str) -> dict[str, str]:
        return {"to": to, "body": body}


class FailingWhatsAppClient:
    async def send_text_message(self, to: str, body: str) -> dict[str, str]:
        raise WhatsAppApiError(
            status_code=400,
            response_text='{"error":{"message":"Recipient phone number not in allowed list."}}',
        )


class FakeBackendApiClient:
    def __init__(
        self,
        recent_open_demands: list[dict] | None = None,
        citizens_by_phone: dict[str, dict] | None = None,
    ) -> None:
        self.created_payload: dict | None = None
        self.recent_open_demands = recent_open_demands or []
        self._next_citizen_id = 500
        self.citizens_by_phone = dict(citizens_by_phone or {})

    async def get_demand_options(self) -> dict:
        return {
            "cities": [
                {"id": 1, "name": "Belo Horizonte", "region": "Centro"},
                {"id": 2, "name": "Betim", "region": "Metropolitana"},
            ],
            "institutions": [
                {"id": 10, "name": "Prefeitura de Belo Horizonte", "type": "Prefeitura", "city_id": 1},
                {"id": 11, "name": "Camara Municipal de Belo Horizonte", "type": "Legislativo", "city_id": 1},
                {"id": 20, "name": "Prefeitura de Betim", "type": "Prefeitura", "city_id": 2},
            ],
        }

    async def search_cities(
        self,
        query: str,
        limit: int = 5,
    ) -> list[dict]:
        normalized_query = query.strip().lower()
        cities = (await self.get_demand_options()).get("cities", [])
        matches = [
            city
            for city in cities
            if city["name"].lower().startswith(normalized_query)
            or f" {normalized_query}" in city["name"].lower()
        ]
        return matches[:limit]

    async def get_city_institutions(
        self,
        city_id: int,
    ) -> list[dict]:
        institutions = (await self.get_demand_options()).get("institutions", [])
        return [
            institution
            for institution in institutions
            if institution.get("city_id") == city_id
        ]

    async def find_citizen_by_phone(
        self,
        phone: str,
    ) -> dict | None:
        citizen = self.citizens_by_phone.get(phone)

        if citizen is None:
            return None

        return dict(citizen)

    async def register_citizen(
        self,
        *,
        name: str,
        phone: str,
        receive_demand_updates: bool,
    ) -> dict:
        citizen = self.citizens_by_phone.get(phone)

        if citizen is None:
            self._next_citizen_id += 1
            citizen = {
                "id": self._next_citizen_id,
                "name": name,
                "phone": phone,
                "receive_demand_updates": receive_demand_updates,
            }
            self.citizens_by_phone[phone] = citizen
        else:
            citizen.update(
                {
                    "name": name,
                    "receive_demand_updates": receive_demand_updates,
                }
            )

        return dict(citizen)

    async def create_demand(self, payload: dict) -> dict:
        self.created_payload = payload
        return {
            "id": 123,
            "status": "under_review" if payload.get("can_create", True) else "discarded",
        }

    async def get_recent_open_demands(
        self,
        city_id: int,
        months: int = 3,
    ) -> list[dict]:
        return self.recent_open_demands


class FakeDemandValidationService:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.validated_payload: dict | None = None

    async def validate(self, demand: dict) -> None:
        self.validated_payload = demand

        if self.error is not None:
            raise self.error


async def _reply(service: ChatbotService, sender: str, text: str) -> str:
    return await service.build_reply(
        IncomingWhatsAppMessage(
            sender=sender,
            message_id=f"msg-{text}",
            text=text,
        )
    )


def _run(coroutine):
    return asyncio.run(coroutine)


def _register_new_citizen(
    service: ChatbotService,
    sender: str,
    *,
    name: str = "Maria Silva",
    wants_updates: str = "1",
) -> None:
    assert "nome completo" in _run(_reply(service, sender, "1"))
    assert "receber atualizacoes" in _run(_reply(service, sender, name))
    assert "titulo curto" in _run(_reply(service, sender, wants_updates))


def test_chatbot_opens_demand_flow() -> None:
    backend_client = FakeBackendApiClient()
    validation_service = FakeDemandValidationService()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=validation_service,
    )

    sender = "31999999999"

    assert "1 - Abrir demanda" in _run(_reply(service, sender, "oi"))
    _register_new_citizen(service, sender)
    assert "explique um pouco melhor" in _run(_reply(service, sender, "Falta de atendimento"))
    assert "primeiras 2 letras da cidade" in _run(
        _reply(
            service,
            sender,
            "Preciso de ajuda com atendimento de saude no meu bairro.",
        )
    )
    city_reply = _run(_reply(service, sender, "Be"))
    assert "Encontrei mais de uma cidade" in city_reply
    assert "Belo Horizonte" in city_reply
    institution_reply = _run(_reply(service, sender, "1"))
    assert "Cidade selecionada: Belo Horizonte" in institution_reply
    assert "0 - Nenhuma instituicao" in institution_reply
    confirmation = _run(_reply(service, sender, "1"))
    assert "A definir pelo gestor" in confirmation
    assert "Status inicial: Em analise" in confirmation

    final_reply = _run(_reply(service, sender, "1"))

    assert "Demanda aberta com sucesso" in final_reply
    assert validation_service.validated_payload == {
        "citizen_id": 501,
        "title": "Falta de atendimento",
        "description": "Preciso de ajuda com atendimento de saude no meu bairro.",
        "priority": None,
        "city_id": 1,
        "institution_id": 10,
    }
    assert backend_client.created_payload == {
        "can_create": True,
        "reason": None,
        "message": None,
        "demanda": {
            "citizen_id": 501,
            "title": "Falta de atendimento",
            "description": "Preciso de ajuda com atendimento de saude no meu bairro.",
            "priority": None,
            "city_id": 1,
            "institution_id": 10,
        },
    }


def test_chatbot_skips_name_when_citizen_is_found_by_phone() -> None:
    backend_client = FakeBackendApiClient(
        citizens_by_phone={
            "5531999999999": {
                "id": 77,
                "name": "Carlos Silva",
                "phone": "5531999999999",
                "receive_demand_updates": True,
            }
        }
    )
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=FakeDemandValidationService(),
    )

    sender = "5531999999999"

    reply = _run(_reply(service, sender, "1"))

    assert "Identifiquei seu cadastro, Carlos Silva" in reply
    assert "titulo curto" in reply


def test_handle_webhook_logs_meta_error_and_does_not_fail(caplog: pytest.LogCaptureFixture) -> None:
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FailingWhatsAppClient(),
        backend_api_client=FakeBackendApiClient(),
    )

    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "contacts": [{"wa_id": "5531999999999"}],
                            "messages": [
                                {
                                    "from": "5531999999999",
                                    "id": "wamid.test",
                                    "timestamp": "1710000000",
                                    "type": "text",
                                    "text": {"body": "1"},
                                }
                            ],
                        }
                    }
                ]
            }
        ]
    }

    with caplog.at_level("ERROR"):
        _run(service.handle_webhook(payload))

    assert "Meta response" in caplog.text
    assert "Recipient phone number not in allowed list" in caplog.text


def test_chatbot_discards_demand_when_language_is_invalid() -> None:
    backend_client = FakeBackendApiClient()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=FakeDemandValidationService(
            error=InvalidLanguageError("Ingles")
        ),
    )

    sender = "31999999999"

    _register_new_citizen(service, sender)
    _run(_reply(service, sender, "Falta de atendimento"))
    _run(_reply(service, sender, "Need help with public healthcare in my neighborhood."))
    _run(_reply(service, sender, "Be"))
    _run(_reply(service, sender, "1"))
    _run(_reply(service, sender, "1"))

    final_reply = _run(_reply(service, sender, "1"))

    assert "marcada como descartada" in final_reply
    assert "Idioma identificado: Ingles" in final_reply
    assert backend_client.created_payload == {
        "can_create": False,
        "reason": "invalid_language",
        "message": "Idioma identificado nao e portugues, mas Ingles.",
        "demanda": {
            "citizen_id": 501,
            "title": "Falta de atendimento",
            "description": "Need help with public healthcare in my neighborhood.",
            "priority": None,
            "city_id": 1,
            "institution_id": 10,
        },
    }


def test_chatbot_discards_demand_when_offensive_language_is_detected() -> None:
    backend_client = FakeBackendApiClient()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=FakeDemandValidationService(
            error=ProfanityDetectedError(["palhacada"])
        ),
    )

    sender = "31999999999"

    _register_new_citizen(service, sender)
    _run(_reply(service, sender, "Reclamacao"))
    _run(
        _reply(
            service,
            sender,
            "Cansei de tanta burocracia. Nada que pedimos resolve, sempre a mesma palhacada.",
        )
    )
    _run(_reply(service, sender, "Be"))
    _run(_reply(service, sender, "1"))
    _run(_reply(service, sender, "1"))

    final_reply = _run(_reply(service, sender, "1"))

    assert "marcada como descartada" in final_reply
    assert "xingamentos" in final_reply
    assert "palhacada" in final_reply
    assert backend_client.created_payload == {
        "can_create": False,
        "reason": "profanity_detected",
        "message": "Foi identificado xingamento devido aos termos palhacada.",
        "demanda": {
            "citizen_id": 501,
            "title": "Reclamacao",
            "description": (
                "Cansei de tanta burocracia. Nada que pedimos resolve, "
                "sempre a mesma palhacada."
            ),
            "priority": None,
            "city_id": 1,
            "institution_id": 10,
        },
    }


def test_chatbot_discards_demand_when_aggressive_tone_is_detected() -> None:
    backend_client = FakeBackendApiClient()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=FakeDemandValidationService(
            error=AggressiveToneDetectedError(
                sentiment_label="negativo",
                sentiment_score=0.96,
                emotions=["raiva"],
                emotion_score=0.81,
            )
        ),
    )

    sender = "31999999999"

    _register_new_citizen(service, sender)
    _run(_reply(service, sender, "Reclamacao"))
    _run(
        _reply(
            service,
            sender,
            "Estou revoltado com essa demora absurda e sem solucao.",
        )
    )
    _run(_reply(service, sender, "Be"))
    _run(_reply(service, sender, "1"))
    _run(_reply(service, sender, "1"))

    final_reply = _run(_reply(service, sender, "1"))

    assert "marcada como descartada" in final_reply
    assert "tom agressivo" in final_reply
    assert "negativo" in final_reply
    assert backend_client.created_payload == {
        "can_create": False,
        "reason": "aggressive_tone_detected",
        "message": (
            "Foi identificado tom agressivo na mensagem com sentimento "
            "negativo com confianca de 0.96 e emocao de raiva "
            "com intensidade de 0.81."
        ),
        "demanda": {
            "citizen_id": 501,
            "title": "Reclamacao",
            "description": "Estou revoltado com essa demora absurda e sem solucao.",
            "priority": None,
            "city_id": 1,
            "institution_id": 10,
        },
    }


def test_chatbot_discards_demand_when_hate_speech_is_detected() -> None:
    backend_client = FakeBackendApiClient()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=FakeDemandValidationService(
            error=HateSpeechDetectedError(
                categories=["racismo", "ofensa"],
                score=0.91,
            )
        ),
    )

    sender = "31999999999"

    _register_new_citizen(service, sender)
    _run(_reply(service, sender, "Denuncia"))
    _run(_reply(service, sender, "Essa mensagem contem termos de odio e ataque direto."))
    _run(_reply(service, sender, "Be"))
    _run(_reply(service, sender, "1"))
    _run(_reply(service, sender, "1"))

    final_reply = _run(_reply(service, sender, "1"))

    assert "marcada como descartada" in final_reply
    assert "discurso de odio" in final_reply
    assert "racismo e ofensa" in final_reply
    assert backend_client.created_payload == {
        "can_create": False,
        "reason": "hate_speech_detected",
        "message": (
            "Foi identificado discurso de odio nas categorias "
            "racismo e ofensa com confianca de 0.91."
        ),
        "demanda": {
            "citizen_id": 501,
            "title": "Denuncia",
            "description": "Essa mensagem contem termos de odio e ataque direto.",
            "priority": None,
            "city_id": 1,
            "institution_id": 10,
        },
    }


def test_chatbot_discards_demand_when_similar_demand_is_found() -> None:
    backend_client = FakeBackendApiClient(
        recent_open_demands=[
            {
                "id": 7001,
                "title": "Falta de atendimento na unidade central",
                "description": "Solicitacao parecida ja em andamento.",
                "status": "under_review",
            }
        ]
    )
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=FakeDemandValidationService(
            error=SimilarDemandFoundError(
                demand_id=7001,
                title="Falta de atendimento na unidade central",
                similarity_score=0.86,
            )
        ),
    )

    sender = "31999999999"

    _register_new_citizen(service, sender)
    _run(_reply(service, sender, "Atendimento parado"))
    _run(_reply(service, sender, "A unidade de saude continua sem atendimento regular."))
    _run(_reply(service, sender, "Be"))
    _run(_reply(service, sender, "1"))
    _run(_reply(service, sender, "1"))

    final_reply = _run(_reply(service, sender, "1"))

    assert "marcada como descartada" in final_reply
    assert "demanda parecida (#7001)" in final_reply
    assert backend_client.created_payload == {
        "can_create": False,
        "reason": "similar_demand_found",
        "message": "Similaridade com a demanda #7001, cerca de 0.86 de similaridade.",
        "demanda": {
            "citizen_id": 501,
            "title": "Atendimento parado",
            "description": "A unidade de saude continua sem atendimento regular.",
            "priority": None,
            "city_id": 1,
            "institution_id": 10,
        },
    }


def test_chatbot_allows_blank_institution_after_city_selection() -> None:
    backend_client = FakeBackendApiClient()
    validation_service = FakeDemandValidationService()
    service = ChatbotService(
        settings=Settings(whatsapp_echo_enabled=True),
        whatsapp_client=FakeWhatsAppClient(),
        backend_api_client=backend_client,
        demand_validation_service=validation_service,
    )

    sender = "31988887777"

    _register_new_citizen(service, sender, name="Joao Silva")
    _run(_reply(service, sender, "Atendimento no bairro"))
    _run(_reply(service, sender, "Preciso registrar uma demanda para a unidade da cidade."))
    city_reply = _run(_reply(service, sender, "Be"))

    assert "Encontrei mais de uma cidade" in city_reply

    institution_reply = _run(_reply(service, sender, "2"))
    assert "Cidade selecionada: Betim" in institution_reply
    assert "responda 0 para deixar em branco" in institution_reply

    confirmation = _run(_reply(service, sender, "0"))

    assert "Instituicao: nao informada." in confirmation
    assert "Instituicao: Nao informada" in confirmation

    final_reply = _run(_reply(service, sender, "1"))

    assert "Demanda aberta com sucesso" in final_reply
    assert validation_service.validated_payload == {
        "citizen_id": 501,
        "title": "Atendimento no bairro",
        "description": "Preciso registrar uma demanda para a unidade da cidade.",
        "priority": None,
        "city_id": 2,
        "institution_id": None,
    }
    assert backend_client.created_payload == {
        "can_create": True,
        "reason": None,
        "message": None,
        "demanda": {
            "citizen_id": 501,
            "title": "Atendimento no bairro",
            "description": "Preciso registrar uma demanda para a unidade da cidade.",
            "priority": None,
            "city_id": 2,
            "institution_id": None,
        },
    }
