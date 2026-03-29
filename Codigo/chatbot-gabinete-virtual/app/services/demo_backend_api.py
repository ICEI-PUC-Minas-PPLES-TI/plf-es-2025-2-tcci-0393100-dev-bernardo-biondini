from typing import Any


class DemoBackendApiClient:
    def __init__(self) -> None:
        self._next_demand_id = 9000

    async def get_demand_options(self) -> dict[str, Any]:
        return {
            "cities": [
                {"id": 1, "name": "Belo Horizonte", "region": "Centro"},
                {"id": 2, "name": "Contagem", "region": "Metropolitana"},
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
                    "name": "Prefeitura de Contagem",
                    "type": "Prefeitura",
                    "city_id": 2,
                },
            ],
        }

    async def create_demand(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._next_demand_id += 1

        return {
            "id": self._next_demand_id,
            "status": "under_review",
            **payload,
        }
