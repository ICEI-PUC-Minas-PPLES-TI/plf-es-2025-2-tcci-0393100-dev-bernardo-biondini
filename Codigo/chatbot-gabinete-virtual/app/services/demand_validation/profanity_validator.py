from functools import lru_cache

from app.services.demand_validation.base import DemandData, demand_text, normalize_text, tokenize
from app.services.demand_validation.exceptions import (
    DemandValidationConfigurationError,
    ProfanityDetectedError,
)


DEFAULT_PROFANITY_WORDS = tuple(
    sorted(
        {
            "arrombado",
            "babaca",
            "bosta",
            "caralho",
            "desgraca",
            "fdp",
            "idiota",
            "imbecil",
            "merda",
            "otario",
            "porra",
            "puta",
            "putaria",
            "retardado",
            "vagabundo",
        }
    )
)


@lru_cache
def _get_profanity_detector(words: tuple[str, ...]) -> object:
    try:
        from better_profanity import Profanity
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'better-profanity' para validar xingamentos na demanda."
        ) from exc

    detector = Profanity()
    detector.load_censor_words(list(words))
    return detector


class ProfanityValidator:
    def __init__(self, blocked_words: tuple[str, ...] = DEFAULT_PROFANITY_WORDS) -> None:
        self.blocked_words = tuple(sorted({normalize_text(word) for word in blocked_words}))

    async def validate(self, demand: DemandData) -> None:
        text = demand_text(demand)
        normalized_text = normalize_text(text)
        detector = _get_profanity_detector(self.blocked_words)
        detected_words = sorted(
            {
                token
                for token in tokenize(text)
                if token in self.blocked_words
            }
        )

        if detected_words or detector.contains_profanity(normalized_text):
            raise ProfanityDetectedError(detected_words or ["termos ofensivos"])
