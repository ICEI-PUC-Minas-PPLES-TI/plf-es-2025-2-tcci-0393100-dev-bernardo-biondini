import pytest

from app.api.routes import (
    InternalChatbotMessageRequest,
    InternalWebSocketAlertRequest,
    publish_internal_websocket_alert,
    send_internal_chatbot_message,
)
from app.config import get_settings
from app.services.realtime_alerts import RealtimeAlertBroker


class FakeWhatsAppClient:
    def __init__(self) -> None:
        self.sent_messages: list[dict[str, str]] = []

    async def send_text_message(self, to: str, body: str) -> dict[str, str]:
        self.sent_messages.append({"to": to, "body": body})
        return {"status": "sent"}


class SpyRealtimeAlertBroker:
    def __init__(self) -> None:
        self.calls: list[tuple[int, dict]] = []

    async def publish_to_user(self, user_id: int, payload: dict) -> int:
        self.calls.append((user_id, payload))
        return 1


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.messages.append(payload)


@pytest.mark.anyio
async def test_internal_chatbot_message_endpoint_sends_message() -> None:
    settings = get_settings()
    previous_token = settings.internal_api_token
    settings.internal_api_token = "internal-secret"

    fake_whatsapp_client = FakeWhatsAppClient()

    try:
        response = await send_internal_chatbot_message(
            payload=InternalChatbotMessageRequest(
                phone="5531999999999",
                message="Sua demanda foi atualizada.",
            ),
            settings=settings,
            whatsapp_client=fake_whatsapp_client,
            internal_token="internal-secret",
        )

        assert response.status_code == 200
        assert response.body == b'{"status":"sent"}'
        assert fake_whatsapp_client.sent_messages == [
            {
                "to": "5531999999999",
                "body": "Sua demanda foi atualizada.",
            }
        ]
    finally:
        settings.internal_api_token = previous_token


@pytest.mark.anyio
async def test_websocket_alert_endpoint_publishes_to_broker() -> None:
    settings = get_settings()
    previous_token = settings.internal_api_token
    settings.internal_api_token = "internal-secret"

    broker = SpyRealtimeAlertBroker()

    try:
        response = await publish_internal_websocket_alert(
            payload=InternalWebSocketAlertRequest(
                user_id=55,
                alert_id=10,
                demand_id=123,
                title="Demanda atualizada",
                message="A demanda recebeu alterações.",
            ),
            settings=settings,
            broker=broker,
            internal_token="internal-secret",
        )

        assert response.status_code == 200
        assert response.body == b'{"status":"published","delivered_connections":1}'
        assert broker.calls == [
            (
                55,
                {
                    "type": "demand_alert",
                    "alert": {
                        "id": 10,
                        "demand_id": 123,
                        "event_id": None,
                        "title": "Demanda atualizada",
                        "message": "A demanda recebeu alterações.",
                    },
                },
            )
        ]
    finally:
        settings.internal_api_token = previous_token


@pytest.mark.anyio
async def test_websocket_alert_endpoint_supports_agenda_reminder_payload() -> None:
    settings = get_settings()
    previous_token = settings.internal_api_token
    settings.internal_api_token = "internal-secret"

    broker = SpyRealtimeAlertBroker()

    try:
        response = await publish_internal_websocket_alert(
            payload=InternalWebSocketAlertRequest(
                user_id=91,
                alert_id=42,
                event_id=777,
                type="agenda_reminder",
                title="Lembrete de agenda",
                message="O evento começa em 1 hora.",
            ),
            settings=settings,
            broker=broker,
            internal_token="internal-secret",
        )

        assert response.status_code == 200
        assert broker.calls == [
            (
                91,
                {
                    "type": "agenda_reminder",
                    "alert": {
                        "id": 42,
                        "demand_id": None,
                        "event_id": 777,
                        "title": "Lembrete de agenda",
                        "message": "O evento começa em 1 hora.",
                    },
                },
            )
        ]
    finally:
        settings.internal_api_token = previous_token


@pytest.mark.anyio
async def test_realtime_alert_broker_delivers_to_connected_user() -> None:
    broker = RealtimeAlertBroker()
    websocket = FakeWebSocket()

    await broker.connect(55, websocket)
    delivered = await broker.publish_to_user(55, {"type": "demand_alert"})

    assert delivered == 1
    assert websocket.messages == [{"type": "demand_alert"}]
