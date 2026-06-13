from app.services.demand_validation.exceptions import (
    AggressiveToneDetectedError,
    DemandValidationConfigurationError,
    DemandValidationException,
    HateSpeechDetectedError,
    InvalidLanguageError,
    ProfanityDetectedError,
    SimilarDemandFoundError,
    SpamDetectedError,
)
from app.services.demand_validation.hate_speech_validator import HateSpeechValidator
from app.services.demand_validation.language_validator import DemandLanguageValidator
from app.services.demand_validation.profanity_validator import ProfanityValidator
from app.services.demand_validation.service import DemandValidationService
from app.services.demand_validation.similarity_validator import SimilarDemandValidator
from app.services.demand_validation.spam_validator import SpamValidator
from app.services.demand_validation.tone_validator import AggressiveToneValidator


def build_default_demand_validation_service(
    backend_api_client: object,
) -> DemandValidationService:
    return DemandValidationService(
        validators=[
            DemandLanguageValidator(),
            ProfanityValidator(),
            HateSpeechValidator(),
            AggressiveToneValidator(),
            SpamValidator(),
            SimilarDemandValidator(backend_api_client=backend_api_client),
        ]
    )


__all__ = [
    "DemandLanguageValidator",
    "AggressiveToneDetectedError",
    "AggressiveToneValidator",
    "DemandValidationConfigurationError",
    "DemandValidationException",
    "DemandValidationService",
    "HateSpeechDetectedError",
    "HateSpeechValidator",
    "InvalidLanguageError",
    "ProfanityDetectedError",
    "ProfanityValidator",
    "SimilarDemandFoundError",
    "SimilarDemandValidator",
    "SpamDetectedError",
    "SpamValidator",
    "build_default_demand_validation_service",
]
