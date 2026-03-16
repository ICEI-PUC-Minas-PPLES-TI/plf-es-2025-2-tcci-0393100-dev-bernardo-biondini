import logging
from typing import Any

from app.config import Settings
from app.models.whatsapp import IncomingWhatsAppMessage
from app.services.whatsapp import WhatsAppClient


logger = logging.getLogger(__name__)


class ChatbotService:
    def __init__(self, settings: Settings, whatsapp_client: WhatsAppClient) -> None:
        self.settings = settings
        self.whatsapp_client = whatsapp_client

    async def handle_webhook(self, payload: dict[str, Any]) -> None:
        for message in self._extract_messages(payload):
            logger.info("Incoming WhatsApp message from %s", message.sender)

            if self.settings.whatsapp_echo_enabled:
                reply = self.build_reply(message)
                await self.whatsapp_client.send_text_message(message.sender, reply)

    def build_reply(self, message: IncomingWhatsAppMessage) -> str:
        return f"Received: {message.text}"

    def _extract_messages(self, payload: dict[str, Any]) -> list[IncomingWhatsAppMessage]:
        messages: list[IncomingWhatsAppMessage] = []

        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                contacts = value.get("contacts", [])
                messages_payload = value.get("messages", [])
                sender = contacts[0]["wa_id"] if contacts else None

                for message in messages_payload:
                    if message.get("type") != "text":
                        continue

                    text_body = message.get("text", {}).get("body")
                    message_id = message.get("id")
                    sender_id = message.get("from") or sender

                    if not text_body or not message_id or not sender_id:
                        continue

                    messages.append(
                        IncomingWhatsAppMessage(
                            sender=sender_id,
                            message_id=message_id,
                            text=text_body,
                        )
                    )

        return messages
