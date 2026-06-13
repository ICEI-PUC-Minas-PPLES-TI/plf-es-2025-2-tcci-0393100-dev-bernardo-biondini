from functools import lru_cache

from app.services.demand_validation.base import DemandData, demand_text
from app.services.demand_validation.exceptions import (
    DemandValidationConfigurationError,
    HateSpeechDetectedError,
)
from app.services.demand_validation.pysentimiento_utils import normalize_label, normalize_scores


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
class HateSpeechValidator:
    def __init__(self, threshold: float = 0.80) -> None:
        self.threshold = threshold

    async def validate(self, demand: DemandData) -> None:
        analyzer = _get_hate_speech_analyzer()
        result = analyzer.predict(demand_text(demand))
        output = normalize_label(getattr(result, "output", ""))
        scores = normalize_scores(getattr(result, "probas", {}))
        hateful_scores = {
            label: score
            for label, score in scores.items()
            if label not in SAFE_OUTPUT_LABELS
        }

        if not hateful_scores:
            return

        top_label, top_score = max(hateful_scores.items(), key=lambda item: item[1])

        if top_score <= self.threshold:
            return

        flagged_labels = [
            label.replace("_", " ")
            for label, score in hateful_scores.items()
            if score > self.threshold
        ]
        categories = flagged_labels or [top_label.replace("_", " ")]
        raise HateSpeechDetectedError(categories=categories, score=top_score)
