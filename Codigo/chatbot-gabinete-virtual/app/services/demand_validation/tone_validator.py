from functools import lru_cache

from app.services.demand_validation.base import DemandData, demand_text
from app.services.demand_validation.exceptions import (
    AggressiveToneDetectedError,
    DemandValidationConfigurationError,
)
from app.services.demand_validation.pysentimiento_utils import normalize_label, normalize_scores


NEGATIVE_SENTIMENT_LABELS = {"neg", "negative"}
BLOCKING_EMOTION_LABELS = {
    "anger",
    "annoyance",
    "desgosto",
    "disgust",
    "frustracao",
    "frustration",
    "irritacao",
    "irritation",
    "raiva",
}
DISPLAY_LABELS = {
    "anger": "raiva",
    "annoyance": "irritacao",
    "desgosto": "desgosto",
    "disgust": "desgosto",
    "frustracao": "frustracao",
    "frustration": "frustracao",
    "irritacao": "irritacao",
    "irritation": "irritacao",
    "neg": "negativo",
    "negative": "negativo",
    "raiva": "raiva",
}


@lru_cache
def _get_sentiment_analyzer() -> object:
    try:
        from pysentimiento import create_analyzer
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'pysentimiento' para validar sentimento da demanda."
        ) from exc

    return create_analyzer(task="sentiment", lang="pt")


@lru_cache
def _get_emotion_analyzer() -> object:
    try:
        from pysentimiento import create_analyzer
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'pysentimiento' para validar emocao da demanda."
        ) from exc

    return create_analyzer(task="emotion", lang="pt")


def _display_label(label: str) -> str:
    normalized_label = normalize_label(label)
    return DISPLAY_LABELS.get(normalized_label, normalized_label.replace("_", " "))


class AggressiveToneValidator:
    def __init__(
        self,
        sentiment_threshold: float = 0.90,
        emotion_threshold: float = 0.80,
        very_negative_threshold: float = 0.99,
    ) -> None:
        self.sentiment_threshold = sentiment_threshold
        self.emotion_threshold = emotion_threshold
        self.very_negative_threshold = very_negative_threshold

    async def validate(self, demand: DemandData) -> None:
        text = demand_text(demand)
        sentiment_result = _get_sentiment_analyzer().predict(text)
        sentiment_output = normalize_label(getattr(sentiment_result, "output", ""))
        sentiment_scores = normalize_scores(getattr(sentiment_result, "probas", {}))
        negative_score = max(
            (
                score
                for label, score in sentiment_scores.items()
                if normalize_label(label) in NEGATIVE_SENTIMENT_LABELS
            ),
            default=0.0,
        )

        if sentiment_output not in NEGATIVE_SENTIMENT_LABELS:
            return

        if negative_score <= self.sentiment_threshold:
            return

        emotion_result = _get_emotion_analyzer().predict(text)
        emotion_scores = normalize_scores(getattr(emotion_result, "probas", {}))
        blocking_emotions = {
            label: score
            for label, score in emotion_scores.items()
            if normalize_label(label) in BLOCKING_EMOTION_LABELS
        }

        top_emotion_label = ""
        top_emotion_score = 0.0
        if blocking_emotions:
            top_emotion_label, top_emotion_score = max(
                blocking_emotions.items(),
                key=lambda item: item[1],
            )

        if (
            top_emotion_score <= self.emotion_threshold
            and negative_score <= self.very_negative_threshold
        ):
            return

        flagged_emotions = [
            _display_label(label)
            for label, score in blocking_emotions.items()
            if score > self.emotion_threshold
        ]

        if not flagged_emotions and top_emotion_score > self.emotion_threshold:
            flagged_emotions = [_display_label(top_emotion_label)]

        raise AggressiveToneDetectedError(
            sentiment_label=_display_label(sentiment_output),
            sentiment_score=negative_score,
            emotions=flagged_emotions,
            emotion_score=top_emotion_score if top_emotion_score > self.emotion_threshold else None,
        )
