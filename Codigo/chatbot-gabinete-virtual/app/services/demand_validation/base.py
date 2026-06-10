import re
import unicodedata
from typing import Any, Protocol


DemandData = dict[str, Any]


class DemandValidator(Protocol):
    async def validate(self, demand: DemandData) -> None: ...


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(ascii_text.lower().strip().split())


def demand_text(demand: DemandData) -> str:
    title = str(demand.get("title", "")).strip()
    description = str(demand.get("description", "")).strip()
    return f"{title}\n{description}".strip()


def tokenize(value: str) -> list[str]:
    return re.findall(r"\b[\w-]+\b", normalize_text(value))
