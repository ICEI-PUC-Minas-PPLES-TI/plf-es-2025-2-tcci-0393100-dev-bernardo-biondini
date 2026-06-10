from functools import lru_cache
from typing import Any

from app.services.demand_validation.base import DemandData, demand_text
from app.services.demand_validation.exceptions import (
    DemandValidationConfigurationError,
    SimilarDemandFoundError,
)


@lru_cache
def _get_similarity_model() -> object:
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'sentence-transformers' para validar demandas parecidas."
        ) from exc

    return SentenceTransformer("sentence-transformers/distiluse-base-multilingual-cased-v1")


@lru_cache
def _get_cosine_similarity() -> object:
    try:
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'scikit-learn' para calcular similaridade entre demandas."
        ) from exc

    return cosine_similarity


class SimilarDemandValidator:
    def __init__(
        self,
        backend_api_client: object,
        similarity_threshold: float = 0.8,
        months_window: int = 3,
    ) -> None:
        self.backend_api_client = backend_api_client
        self.similarity_threshold = similarity_threshold
        self.months_window = months_window

    async def validate(self, demand: DemandData) -> None:
        city_id = demand.get("city_id")

        if not city_id:
            return

        demands = await self.backend_api_client.get_recent_open_demands(
            city_id=int(city_id),
            months=self.months_window,
        )

        candidate_demands: list[dict[str, Any]] = []
        candidate_texts: list[str] = []

        for existing_demand in demands:
            candidate_text = demand_text(existing_demand)

            if not candidate_text:
                continue

            candidate_demands.append(existing_demand)
            candidate_texts.append(candidate_text)

        if not candidate_texts:
            return

        model = _get_similarity_model()
        cosine_similarity = _get_cosine_similarity()
        embeddings = model.encode(
            [demand_text(demand), *candidate_texts],
            convert_to_numpy=True,
        )
        similarities = cosine_similarity([embeddings[0]], embeddings[1:])[0]
        best_index, best_score = max(
            enumerate(similarities),
            key=lambda item: float(item[1]),
        )

        if float(best_score) <= self.similarity_threshold:
            return

        matched_demand = candidate_demands[best_index]
        raise SimilarDemandFoundError(
            demand_id=matched_demand.get("id"),
            title=str(matched_demand.get("title", "Demanda existente")),
            similarity_score=float(best_score),
        )
