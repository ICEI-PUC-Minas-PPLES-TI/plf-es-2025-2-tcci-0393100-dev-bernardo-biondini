import logging
from functools import lru_cache
from typing import Any, Literal

import httpx
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.backend_api import BackendApiClient
from app.services.chatbot import ChatbotService
from app.services.demo_backend_api import DemoBackendApiClient
from app.services.demand_validation import build_default_demand_validation_service
from app.services.realtime_alerts import RealtimeAlertBroker
from app.services.whatsapp import SignatureValidationError, WhatsAppClient


logger = logging.getLogger(__name__)
router = APIRouter()


class DemoChatRequest(BaseModel):
    sender: str = Field(
        ...,
        min_length=3,
        description="Identificador do remetente. Use o mesmo valor para manter a conversa.",
    )
    text: str = Field(..., min_length=1, description="Mensagem enviada para o chatbot.")
    mode: Literal["mock", "live"] = Field(
        default="mock",
        description=(
            "mock usa dados simulados e nao depende do backend. "
            "live usa o backend Laravel real configurado."
        ),
    )
    reset_session: bool = Field(
        default=False,
        description="Reinicia a sessao do remetente antes de processar a mensagem.",
    )


class DemoChatResponse(BaseModel):
    mode: Literal["mock", "live"]
    reply: str
    state: str
    session_data: dict[str, Any]


class InternalChatbotMessageRequest(BaseModel):
    phone: str = Field(..., min_length=8)
    message: str = Field(..., min_length=1)


class InternalWebSocketAlertRequest(BaseModel):
    user_id: int
    alert_id: int
    type: Literal["agenda_reminder", "demand_alert"] = "demand_alert"
    demand_id: int | None = None
    event_id: int | None = None
    title: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)


@lru_cache
def get_whatsapp_client() -> WhatsAppClient:
    return WhatsAppClient(get_settings())


@lru_cache
def get_backend_api_client() -> BackendApiClient:
    return BackendApiClient(get_settings())


@lru_cache
def get_demo_backend_api_client() -> DemoBackendApiClient:
    return DemoBackendApiClient()


@lru_cache
def get_chatbot_service() -> ChatbotService:
    settings = get_settings()
    backend_api_client = get_backend_api_client()
    return ChatbotService(
        settings=settings,
        whatsapp_client=get_whatsapp_client(),
        backend_api_client=backend_api_client,
        demand_validation_service=build_default_demand_validation_service(
            backend_api_client
        ),
    )


@lru_cache
def get_realtime_alert_broker() -> RealtimeAlertBroker:
    return RealtimeAlertBroker()


def _validate_internal_token(
    provided_token: str | None,
    settings: Settings,
) -> None:
    expected_token = settings.internal_api_token or settings.backend_api_token

    if not expected_token or provided_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token.",
        )


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@lru_cache
def get_mock_chatbot_service() -> ChatbotService:
    settings = get_settings()
    return ChatbotService(
        settings=settings,
        whatsapp_client=get_whatsapp_client(),
        backend_api_client=get_demo_backend_api_client(),
    )


@router.post(
    "/demo/chat",
    response_model=DemoChatResponse,
    summary="Simula mensagens do chatbot sem a API do WhatsApp",
)
async def demo_chat(
    payload: DemoChatRequest,
) -> DemoChatResponse:
    if get_settings().app_env.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo local indisponivel em producao.",
        )

    service = (
        get_mock_chatbot_service()
        if payload.mode == "mock"
        else get_chatbot_service()
    )

    if payload.reset_session:
        service.sessions.pop(payload.sender, None)

    try:
        reply = await service.build_reply(
            IncomingWhatsAppMessage(
                sender=payload.sender,
                message_id="demo-message",
                text=payload.text,
            )
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"{exc}. Use mode='mock' para demo local ou configure o backend."
            ),
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Nao foi possivel comunicar com o backend configurado. "
                "Use mode='mock' para a gravacao ou inicie o backend Laravel."
            ),
        ) from exc

    session = service.sessions.get(payload.sender)

    return DemoChatResponse(
        mode=payload.mode,
        reply=reply,
        state=session.state if session else "menu",
        session_data=dict(session.data) if session else {},
    )


@router.get("/webhooks/whatsapp")
async def verify_whatsapp_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
    settings: Settings = Depends(get_settings),
) -> PlainTextResponse:
    if hub_mode != "subscribe" or hub_verify_token != settings.whatsapp_verify_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Webhook verification failed.",
        )

    return PlainTextResponse(hub_challenge)


@router.post("/webhooks/whatsapp")
async def receive_whatsapp_event(
    request: Request,
    chatbot_service: ChatbotService = Depends(get_chatbot_service),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client),
) -> JSONResponse:
    raw_body = await request.body()

    try:
        whatsapp_client.validate_signature(
            signature=request.headers.get("X-Hub-Signature-256"),
            body=raw_body,
        )
    except SignatureValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    payload = await request.json()
    await chatbot_service.handle_webhook(payload)

    logger.info("WhatsApp webhook processed successfully.")
    return JSONResponse({"status": "received"})


@router.post("/internal/notifications/chatbot-message")
async def send_internal_chatbot_message(
    payload: InternalChatbotMessageRequest,
    settings: Settings = Depends(get_settings),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client),
    internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> JSONResponse:
    _validate_internal_token(internal_token, settings)

    await whatsapp_client.send_text_message(payload.phone, payload.message)

    return JSONResponse({"status": "sent"})


@router.post("/internal/notifications/websocket-alert")
async def publish_internal_websocket_alert(
    payload: InternalWebSocketAlertRequest,
    settings: Settings = Depends(get_settings),
    broker: RealtimeAlertBroker = Depends(get_realtime_alert_broker),
    internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> JSONResponse:
    _validate_internal_token(internal_token, settings)

    delivered = await broker.publish_to_user(
        payload.user_id,
        {
            "type": payload.type,
            "alert": {
                "id": payload.alert_id,
                "demand_id": payload.demand_id,
                "event_id": payload.event_id,
                "title": payload.title,
                "message": payload.message,
            },
        },
    )

    return JSONResponse(
        {
            "status": "published",
            "delivered_connections": delivered,
        }
    )


@router.websocket("/ws/alerts")
async def alerts_websocket(
    websocket: WebSocket,
    broker: RealtimeAlertBroker = Depends(get_realtime_alert_broker),
    backend_api_client: BackendApiClient = Depends(get_backend_api_client),
) -> None:
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = await backend_api_client.get_authenticated_user(token)

    if not user or "id" not in user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = int(user["id"])

    await websocket.accept()
    await broker.connect(user_id, websocket)
    await websocket.send_json({"type": "connected", "user_id": user_id})

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await broker.disconnect(user_id, websocket)
