from collections import Counter
from functools import lru_cache

from app.services.demand_validation.base import DemandData, demand_text, normalize_text, tokenize
from app.services.demand_validation.exceptions import (
    DemandValidationConfigurationError,
    SpamDetectedError,
)


PROMOTIONAL_TERMS = {
    "clique",
    "gratis",
    "imperdivel",
    "link",
    "oferta",
    "pix",
    "promo",
    "promocao",
    "sorteio",
    "urgente",
    "whatsapp",
}


@lru_cache
def _get_url_extractor() -> object:
    try:
        from urlextract import URLExtract
    except ImportError as exc:
        raise DemandValidationConfigurationError(
            "Instale 'urlextract' para validar sinais de spam na demanda."
        ) from exc

    return URLExtract()


class SpamValidator:
    def __init__(
        self,
        url_threshold: int = 2,
        repeated_token_threshold: int = 5,
        uppercase_threshold: float = 0.7,
    ) -> None:
        self.url_threshold = url_threshold
        self.repeated_token_threshold = repeated_token_threshold
        self.uppercase_threshold = uppercase_threshold

    async def validate(self, demand: DemandData) -> None:
        raw_text = demand_text(demand)
        normalized_text = normalize_text(raw_text)
        urls = _get_url_extractor().find_urls(raw_text)
        tokens = [token for token in tokenize(normalized_text) if len(token) > 2]
        token_counter = Counter(tokens)
        repeated_tokens = sorted(
            token
            for token, count in token_counter.items()
            if count >= self.repeated_token_threshold
        )
        promotional_terms = sorted(set(tokens) & PROMOTIONAL_TERMS)
        repeated_segments = self._repeated_segments(normalized_text)
        signals: list[str] = []

        if len(urls) >= self.url_threshold:
            signals.append(f"{len(urls)} links na mensagem")

        if repeated_tokens:
            signals.append(
                "repeticao excessiva das palavras "
                + ", ".join(repeated_tokens[:3])
            )

        if repeated_segments:
            signals.append("repeticao do mesmo trecho da mensagem")

        if promotional_terms:
            signals.append(
                "uso de termos promocionais como "
                + ", ".join(promotional_terms[:3])
            )

        if self._uppercase_ratio(raw_text) >= self.uppercase_threshold and len(raw_text) >= 40:
            signals.append("uso excessivo de letras maiusculas")

        if len(signals) >= 2 or len(urls) > self.url_threshold:
            raise SpamDetectedError(signals=signals)

    def _repeated_segments(self, text: str) -> bool:
        segments = [segment.strip() for segment in text.split(".") if segment.strip()]

        if len(segments) < 2:
            return False

        return any(count >= 2 for count in Counter(segments).values())

    def _uppercase_ratio(self, value: str) -> float:
        letters = [char for char in value if char.isalpha()]

        if not letters:
            return 0.0

        uppercase_count = sum(1 for char in letters if char.isupper())
        return uppercase_count / len(letters)
