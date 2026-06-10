from functools import lru_cache

from app.services.demand_validation.base import DemandData, demand_text
from app.services.demand_validation.exceptions import (
    DemandValidationConfigurationError,
    InvalidLanguageError,
)


LANGUAGE_LABELS = {
    "PORTUGUESE": "Portugues",
    "ENGLISH": "Ingles",
    "SPANISH": "Espanhol",
    "FRENCH": "Frances",
    "ITALIAN": "Italiano",
}


@lru_cache
def _get_language_detector() -> tuple[object, object]:
    try:
        from lingua import Language, LanguageDetectorBuilder
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'lingua-language-detector' para validar o idioma da demanda."
        ) from exc

    detector = LanguageDetectorBuilder.from_languages(
        Language.PORTUGUESE,
        Language.ENGLISH,
        Language.SPANISH,
        Language.FRENCH,
        Language.ITALIAN,
    ).build()

    return Language, detector


def _language_label(language: object | None) -> str:
    if language is None:
        return "Nao identificado"

    name = getattr(language, "name", str(language))
    return LANGUAGE_LABELS.get(str(name), str(name).title())


class DemandLanguageValidator:
    async def validate(self, demand: DemandData) -> None:
        language_enum, detector = _get_language_detector()
        language = detector.detect_language_of(demand_text(demand))

        if language != language_enum.PORTUGUESE:
            raise InvalidLanguageError(_language_label(language))
