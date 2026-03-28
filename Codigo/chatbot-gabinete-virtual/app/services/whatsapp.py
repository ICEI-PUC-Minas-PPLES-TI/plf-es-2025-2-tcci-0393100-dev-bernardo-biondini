import hashlib
import hmac
from typing import Any

import httpx

from app.config import Settings


class SignatureValidationError(Exception):
    """Raised when the webhook signature is invalid."""


class WhatsAppClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = (
            f"https://graph.facebook.com/"
            f"{self.settings.whatsapp_api_version}/"
            f"{self.settings.whatsapp_phone_number_id}"
        )

    def validate_signature(self, signature: str | None, body: bytes) -> None:
        if not self.settings.whatsapp_app_secret:
            return

        if not signature:
            raise SignatureValidationError("Missing webhook signature.")

        expected = hmac.new(
            self.settings.whatsapp_app_secret.encode("utf-8"),
            msg=body,
            digestmod=hashlib.sha256,
        ).hexdigest()

        received = signature.removeprefix("sha256=")
        if not hmac.compare_digest(expected, received):
            raise SignatureValidationError("Invalid webhook signature.")

    async def send_text_message(self, to: str, body: str) -> dict[str, Any]:
        if not self.settings.whatsapp_access_token:
            raise RuntimeError("WHATSAPP_ACCESS_TOKEN is not configured.")

        if not self.settings.whatsapp_phone_number_id:
            raise RuntimeError("WHATSAPP_PHONE_NUMBER_ID is not configured.")

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"body": body},
        }

        headers = {
            "Authorization": f"Bearer {self.settings.whatsapp_access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            return response.json()
