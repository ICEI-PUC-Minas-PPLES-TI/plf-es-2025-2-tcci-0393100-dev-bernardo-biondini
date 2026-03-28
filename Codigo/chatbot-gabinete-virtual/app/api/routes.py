import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, PlainTextResponse

from app.config import Settings, get_settings
from app.services.chatbot import ChatbotService
from app.services.whatsapp import SignatureValidationError, WhatsAppClient


logger = logging.getLogger(__name__)
router = APIRouter()


def get_whatsapp_client(settings: Settings = Depends(get_settings)) -> WhatsAppClient:
    return WhatsAppClient(settings)


def get_chatbot_service(
    settings: Settings = Depends(get_settings),
    whatsapp_client: WhatsAppClient = Depends(get_whatsapp_client),
) -> ChatbotService:
    return ChatbotService(settings, whatsapp_client)


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


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
