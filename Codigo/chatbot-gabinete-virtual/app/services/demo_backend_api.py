from typing import Any


class DemoBackendApiClient:
    def __init__(self) -> None:
        self._next_demand_id = 9000
        self._next_citizen_id = 100
        self._citizens_by_phone: dict[str, dict[str, Any]] = {}

    async def get_demand_options(self) -> dict[str, Any]:
        return {
            "cities": [
                {"id": 1, "name": "Belo Horizonte", "region": "Centro"},
                {"id": 2, "name": "Betim", "region": "Metropolitana"},
                {"id": 3, "name": "Contagem", "region": "Metropolitana"},
            ],
            "institutions": [
                {
                    "id": 10,
                    "name": "Prefeitura de Belo Horizonte",
                    "type": "Prefeitura",
                    "city_id": 1,
                },
                {
                    "id": 11,
                    "name": "Camara Municipal de Belo Horizonte",
                    "type": "Legislativo",
                    "city_id": 1,
                },
                {
                    "id": 20,
                    "name": "Prefeitura de Betim",
                    "type": "Prefeitura",
                    "city_id": 2,
                },
                {
                    "id": 30,
                    "name": "Prefeitura de Contagem",
                    "type": "Prefeitura",
                    "city_id": 3,
                },
            ],
        }

    async def search_cities(
        self,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        normalized_query = query.strip().lower()

        if not normalized_query:
            return []

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
    ) -> list[dict[str, Any]]:
        institutions = (await self.get_demand_options()).get("institutions", [])
        return [
            institution
            for institution in institutions
            if institution.get("city_id") == city_id
        ]

    async def find_citizen_by_phone(
        self,
        phone: str,
    ) -> dict[str, Any] | None:
        return self._citizens_by_phone.get(phone)

    async def register_citizen(
        self,
        *,
        name: str,
        phone: str,
        receive_demand_updates: bool,
    ) -> dict[str, Any]:
        citizen = self._citizens_by_phone.get(phone)

        if citizen is None:
            self._next_citizen_id += 1
            citizen = {
                "id": self._next_citizen_id,
                "name": name,
                "phone": phone,
                "receive_demand_updates": receive_demand_updates,
            }
            self._citizens_by_phone[phone] = citizen
        else:
            citizen.update(
                {
                    "name": name,
                    "receive_demand_updates": receive_demand_updates,
                }
            )

        return dict(citizen)

    async def create_demand(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._next_demand_id += 1
        demand = payload["demanda"]

        return {
            "id": self._next_demand_id,
            "status": "under_review" if payload.get("can_create", True) else "discarded",
            **demand,
        }

    async def get_recent_open_demands(
        self,
        city_id: int,
        months: int = 3,
    ) -> list[dict[str, Any]]:
        if city_id != 1 or months < 1:
            return []

        return [
            {
                "id": 7001,
                "title": "Falta de atendimento na unidade central",
                "description": "Solicitacao semelhante de atendimento na mesma cidade.",
                "status": "under_review",
            }
        ]
