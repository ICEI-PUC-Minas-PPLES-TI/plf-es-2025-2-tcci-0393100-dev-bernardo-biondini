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
            "palhacada",
            "porra",
            "puta",
            "putaria",
            "retardado",
            "ridicula",
            "ridiculo",
            "vagabundo",
        }
    )
)

DEFAULT_OFFENSIVE_PHRASES = tuple(
    sorted(
        {
            "e uma piada",
            "isso e ridiculo",
            "isso e uma palhacada",
            "isso e uma vergonha",
            "que palhacada",
            "que ridicula",
            "que ridiculo",
            "que vergonha",
            "sempre a mesma palhacada",
            "uma vergonha",
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
    def __init__(
        self,
        blocked_words: tuple[str, ...] = DEFAULT_PROFANITY_WORDS,
        blocked_phrases: tuple[str, ...] = DEFAULT_OFFENSIVE_PHRASES,
    ) -> None:
        self.blocked_words = tuple(sorted({normalize_text(word) for word in blocked_words}))
        self.blocked_phrases = tuple(
            sorted({normalize_text(phrase) for phrase in blocked_phrases})
        )

    async def validate(self, demand: DemandData) -> None:
        text = demand_text(demand)
        normalized_text = normalize_text(text)
        normalized_token_text = " ".join(tokenize(text))
        detector = _get_profanity_detector(self.blocked_words)
        detected_words = sorted(
            {
                token
                for token in tokenize(text)
                if token in self.blocked_words
            }
        )
        detected_phrases = sorted(
            {
                phrase
                for phrase in self.blocked_phrases
                if phrase in normalized_token_text
            }
        )

        detected_terms = sorted(set(detected_words + detected_phrases))

        if detected_terms or detector.contains_profanity(normalized_text):
            raise ProfanityDetectedError(detected_terms or ["termos ofensivos"])
