from functools import lru_cache
from typing import Any

from app.services.demand_validation.base import DemandData, demand_text
from app.services.demand_validation.exceptions import (
    DemandValidationConfigurationError,
    HateSpeechDetectedError,
)


SAFE_OUTPUT_LABELS = {
    "",
    "none",
    "neutral",
    "non-hateful",
    "non_hateful",
    "not_hateful",
}


@lru_cache
def _get_hate_speech_analyzer() -> object:
    try:
        from pysentimiento import create_analyzer
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'pysentimiento' para validar discurso de odio na demanda."
        ) from exc

    return create_analyzer(task="hate_speech", lang="pt")


def _normalize_scores(probas: Any) -> dict[str, float]:
    if not isinstance(probas, dict):
        return {}

    normalized_scores: dict[str, float] = {}

    for label, score in probas.items():
        try:
            normalized_scores[str(label).lower().strip()] = float(score)
        except (TypeError, ValueError):
            continue

    return normalized_scores


class HateSpeechValidator:
    def __init__(self, threshold: float = 0.75) -> None:
        self.threshold = threshold

    async def validate(self, demand: DemandData) -> None:
        analyzer = _get_hate_speech_analyzer()
        result = analyzer.predict(demand_text(demand))
        output = str(getattr(result, "output", "")).lower().strip()
        scores = _normalize_scores(getattr(result, "probas", {}))

        flagged_labels = [
            label.replace("_", " ")
            for label, score in scores.items()
            if score >= self.threshold and label not in SAFE_OUTPUT_LABELS
        ]

        if not flagged_labels and output in SAFE_OUTPUT_LABELS:
            return

        top_label = output or "hate_speech"
        top_score = scores.get(output)

        if top_score is None and scores:
            top_label, top_score = max(scores.items(), key=lambda item: item[1])
            top_label = top_label.replace("_", " ")

        categories = flagged_labels or [top_label.replace("_", " ")]
        raise HateSpeechDetectedError(categories=categories, score=top_score)
