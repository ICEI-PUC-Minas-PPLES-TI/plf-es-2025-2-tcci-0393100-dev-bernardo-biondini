import logging
from typing import Any


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

    async def get_authenticated_user(self, token: str) -> dict[str, Any] | None:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/auth/me",
                headers={
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}",
                },
            )

            if response.status_code == 401:
                return None

            response.raise_for_status()
            payload = response.json()

        return payload.get("user")

    async def get_demand_options(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/chatbot/demand-options",
                headers=self._headers(),
            )
            response.raise_for_status()
            payload = response.json()

        return payload.get("data", {})

    async def search_cities(
        self,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/chatbot/cities",
                headers=self._headers(),
                params={
                    "query": query,
                    "limit": limit,
                },
            )
            response.raise_for_status()
            payload = response.json()

        return payload.get("data", [])

    async def get_city_institutions(
        self,
        city_id: int,
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/chatbot/cities/{city_id}/institutions",
                headers=self._headers(),
            )
            response.raise_for_status()
            payload = response.json()

        return payload.get("data", [])

    async def find_citizen_by_phone(
        self,
        phone: str,
    ) -> dict[str, Any] | None:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/chatbot/citizens/lookup",
                headers=self._headers(),
                params={"phone": phone},
            )
            response.raise_for_status()
            payload = response.json()

        return payload.get("data")

    async def register_citizen(
        self,
        *,
        name: str,
        phone: str,
        receive_demand_updates: bool,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self.base_url}/api/chatbot/citizens",
                headers=self._headers(),
                json={
                    "name": name,
                    "phone": phone,
                    "receive_demand_updates": receive_demand_updates,
                },
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

    async def get_recent_open_demands(
        self,
        city_id: int,
        months: int = 3,
    ) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                f"{self.base_url}/api/chatbot/demands/open",
                headers=self._headers(),
                params={
                    "city_id": city_id,
                    "months": months,
                },
            )
            response.raise_for_status()
            payload = response.json()

        return payload.get("data", [])
