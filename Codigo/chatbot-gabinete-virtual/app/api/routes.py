import logging
from functools import lru_cache
from typing import Any, Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.backend_api import BackendApiClient
from app.services.chatbot import ChatbotService
from app.services.demo_backend_api import DemoBackendApiClient
from app.services.demand_validation import build_default_demand_validation_service
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
    chatbot_service: ChatbotService = Depends(get_chatbot_service),
    mock_chatbot_service: ChatbotService = Depends(get_mock_chatbot_service),
) -> DemoChatResponse:
    if get_settings().app_env.lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo local indisponivel em producao.",
        )

    service = mock_chatbot_service if payload.mode == "mock" else chatbot_service

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
