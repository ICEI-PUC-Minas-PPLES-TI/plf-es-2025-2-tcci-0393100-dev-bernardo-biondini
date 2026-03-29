from typing import Any
import logging


import httpx

from app.config import Settings

logger = logging.getLogger(__name__)

class BackendApiClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = self.settings.backend_api_url.rstrip("/")

    def _headers(self) -> dict[str, str]:
        if not self.settings.backend_api_token:
            raise RuntimeError("BACKEND_API_TOKEN is not configured.")

        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Chatbot-Token": self.settings.backend_api_token,
        }

    async def get_demand_options(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/chatbot/demand-options",
                headers=self._headers(),
            )
            response.raise_for_status()
            payload = response.json()

        return payload.get("data", {})

    async def create_demand(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            logger.info("Creating demand with payload: %s", payload)
            logger.debug("POST %s/api/chatbot/demands", self.base_url)
            logger.debug("Headers: %s", self._headers())
            response = await client.post(
                f"{self.base_url}/api/chatbot/demands",
                headers=self._headers(),
                json=payload,
            )
            response.raise_for_status()
            body = response.json()

        return body.get("data", {})
