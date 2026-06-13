def _join_items(items: list[str]) -> str:
    if not items:
        return ""

    if len(items) == 1:
        return items[0]

    return ", ".join(items[:-1]) + f" e {items[-1]}"


class DemandValidationConfigurationError(RuntimeError):
    pass


class DemandValidationException(Exception):
    def __init__(
        self,
        reason: str,
        backend_message: str,
        reply_message: str | None = None,
    ) -> None:
        super().__init__(backend_message)
        self.reason = reason
        self.backend_message = backend_message
        self.reply_message = reply_message or backend_message


class InvalidLanguageError(DemandValidationException):
    def __init__(self, detected_language: str) -> None:
        super().__init__(
            reason="invalid_language",
            backend_message=(
                "Idioma identificado nao e portugues, mas "
                f"{detected_language}."
            ),
            reply_message=(
                "O texto enviado nao esta em portugues. "
                f"Idioma identificado: {detected_language}."
            ),
        )


class ProfanityDetectedError(DemandValidationException):
    def __init__(self, offensive_words: list[str]) -> None:
        words = _join_items(offensive_words)
        super().__init__(
            reason="profanity_detected",
            backend_message=(
                "Foi identificado xingamento devido aos termos "
                f"{words}."
            ),
            reply_message=(
                "A mensagem contem xingamentos e foi marcada como descartada. "
                f"Termos encontrados: {words}."
            ),
        )


class HateSpeechDetectedError(DemandValidationException):
    def __init__(self, categories: list[str], score: float | None = None) -> None:
        categories_text = _join_items(categories) or "discurso de odio"
        score_text = f" com confianca de {score:.2f}" if score is not None else ""

        super().__init__(
            reason="hate_speech_detected",
            backend_message=(
                "Foi identificado discurso de odio nas categorias "
                f"{categories_text}{score_text}."
            ),
            reply_message=(
                "A mensagem foi identificada como discurso de odio "
                f"({categories_text}{score_text})."
            ),
        )


class AggressiveToneDetectedError(DemandValidationException):
    def __init__(
        self,
        sentiment_label: str,
        sentiment_score: float | None = None,
        emotions: list[str] | None = None,
        emotion_score: float | None = None,
    ) -> None:
        sentiment_text = sentiment_label

        if sentiment_score is not None:
            sentiment_text += f" com confianca de {sentiment_score:.2f}"

        emotions = emotions or []
        emotion_text = ""

        if emotions:
            emotion_text = f" e emocao de {_join_items(emotions)}"

            if emotion_score is not None:
                emotion_text += f" com intensidade de {emotion_score:.2f}"

        super().__init__(
            reason="aggressive_tone_detected",
            backend_message=(
                "Foi identificado tom agressivo na mensagem com "
                f"sentimento {sentiment_text}{emotion_text}."
            ),
            reply_message=(
                "A mensagem foi identificada com tom agressivo e foi marcada "
                f"como descartada ({sentiment_text}{emotion_text})."
            ),
        )


class SpamDetectedError(DemandValidationException):
    def __init__(self, signals: list[str]) -> None:
        joined_signals = _join_items(signals)
        super().__init__(
            reason="spam_detected",
            backend_message=(
                "Foi identificado um possivel spam devido aos sinais: "
                f"{joined_signals}."
            ),
            reply_message=(
                "A mensagem foi marcada como possivel spam. "
                f"Sinais encontrados: {joined_signals}."
            ),
        )


class SimilarDemandFoundError(DemandValidationException):
    def __init__(self, demand_id: int | None, title: str, similarity_score: float) -> None:
        reference = f"#{demand_id}" if demand_id is not None else title

        super().__init__(
            reason="similar_demand_found",
            backend_message=(
                f"Similaridade com a demanda {reference}, "
                f"cerca de {similarity_score:.2f} de similaridade."
            ),
            reply_message=(
                f"Foi encontrada uma demanda parecida ({reference}) "
                f"com similaridade de {similarity_score:.2f}."
            ),
        )
