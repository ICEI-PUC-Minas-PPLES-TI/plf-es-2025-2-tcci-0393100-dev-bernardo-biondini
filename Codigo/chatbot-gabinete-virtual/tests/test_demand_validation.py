import asyncio
from types import SimpleNamespace

import pytest

from app.services.demand_validation.exceptions import (
    HateSpeechDetectedError,
    SimilarDemandFoundError,
)
from app.services.demand_validation.hate_speech_validator import HateSpeechValidator
from app.services.demand_validation.similarity_validator import SimilarDemandValidator


class FakeSimilarityBackendApiClient:
    def __init__(self, demands: list[dict]) -> None:
        self.demands = demands
        self.calls: list[dict[str, int]] = []

    async def get_recent_open_demands(
        self,
        city_id: int,
        months: int = 3,
    ) -> list[dict]:
        self.calls.append({"city_id": city_id, "months": months})
        return self.demands


class FakeEmbeddingModel:
    def __init__(self, embeddings):
        self.embeddings = embeddings
        self.last_texts = None

    def encode(self, texts, convert_to_numpy=True):
        self.last_texts = list(texts)
        return self.embeddings


def _run(coroutine):
    return asyncio.run(coroutine)


def test_hate_speech_validator_detects_hateful_message(monkeypatch) -> None:
    fake_result = SimpleNamespace(
        output="racism",
        probas={
            "racism": 0.91,
            "none": 0.09,
        },
    )
    fake_analyzer = SimpleNamespace(predict=lambda text: fake_result)

    monkeypatch.setattr(
        "app.services.demand_validation.hate_speech_validator._get_hate_speech_analyzer",
        lambda: fake_analyzer,
    )

    validator = HateSpeechValidator()
    demand = {
        "title": "Mensagem ofensiva",
        "description": "Conteudo com ataque discriminatorio.",
    }

    with pytest.raises(HateSpeechDetectedError) as exc_info:
        _run(validator.validate(demand))

    assert exc_info.value.reason == "hate_speech_detected"
    assert "racism" in exc_info.value.backend_message
    assert "0.91" in exc_info.value.backend_message


def test_hate_speech_validator_allows_safe_message(monkeypatch) -> None:
    fake_result = SimpleNamespace(
        output="none",
        probas={
            "none": 0.98,
            "racism": 0.02,
        },
    )
    fake_analyzer = SimpleNamespace(predict=lambda text: fake_result)

    monkeypatch.setattr(
        "app.services.demand_validation.hate_speech_validator._get_hate_speech_analyzer",
        lambda: fake_analyzer,
    )

    validator = HateSpeechValidator()
    demand = {
        "title": "Pedido de ajuda",
        "description": "Solicito reparo na unidade de saude do bairro.",
    }

    _run(validator.validate(demand))


def test_similar_demand_validator_detects_matching_demand(monkeypatch) -> None:
    backend_client = FakeSimilarityBackendApiClient(
        demands=[
            {
                "id": 41,
                "title": "Atendimento suspenso na UBS",
                "description": "Moradores relatam falta de atendimento na unidade.",
            },
            {
                "id": 99,
                "title": "Outro tema",
                "description": "Demanda diferente.",
            },
        ]
    )
    model = FakeEmbeddingModel(
        embeddings=[
            [1.0, 0.0],
            [0.9, 0.1],
            [0.1, 0.9],
        ]
    )

    monkeypatch.setattr(
        "app.services.demand_validation.similarity_validator._get_similarity_model",
        lambda: model,
    )
    monkeypatch.setattr(
        "app.services.demand_validation.similarity_validator._get_cosine_similarity",
        lambda: (lambda current, candidates: [[0.86, 0.21]]),
    )

    validator = SimilarDemandValidator(
        backend_api_client=backend_client,
        similarity_threshold=0.8,
        months_window=3,
    )
    demand = {
        "title": "Atendimento parado",
        "description": "A UBS do bairro segue sem atendimento regular.",
        "city_id": 2,
    }

    with pytest.raises(SimilarDemandFoundError) as exc_info:
        _run(validator.validate(demand))

    assert backend_client.calls == [{"city_id": 2, "months": 3}]
    assert model.last_texts == [
        "Atendimento parado\nA UBS do bairro segue sem atendimento regular.",
        "Atendimento suspenso na UBS\nMoradores relatam falta de atendimento na unidade.",
        "Outro tema\nDemanda diferente.",
    ]
    assert exc_info.value.reason == "similar_demand_found"
    assert "#41" in exc_info.value.backend_message
    assert "0.86" in exc_info.value.backend_message


def test_similar_demand_validator_ignores_low_similarity(monkeypatch) -> None:
    backend_client = FakeSimilarityBackendApiClient(
        demands=[
            {
                "id": 55,
                "title": "Pedido antigo",
                "description": "Tema sem relacao com a nova demanda.",
            }
        ]
    )
    model = FakeEmbeddingModel(
        embeddings=[
            [1.0, 0.0],
            [0.2, 0.8],
        ]
    )

    monkeypatch.setattr(
        "app.services.demand_validation.similarity_validator._get_similarity_model",
        lambda: model,
    )
    monkeypatch.setattr(
        "app.services.demand_validation.similarity_validator._get_cosine_similarity",
        lambda: (lambda current, candidates: [[0.44]]),
    )

    validator = SimilarDemandValidator(
        backend_api_client=backend_client,
        similarity_threshold=0.8,
    )
    demand = {
        "title": "Poda de arvore",
        "description": "Solicito poda preventiva na avenida principal.",
        "city_id": 1,
    }

    _run(validator.validate(demand))
    assert backend_client.calls == [{"city_id": 1, "months": 3}]


def test_similar_demand_validator_skips_lookup_when_city_id_is_missing() -> None:
    backend_client = FakeSimilarityBackendApiClient(demands=[])
    validator = SimilarDemandValidator(
        backend_api_client=backend_client,
        similarity_threshold=0.8,
    )
    demand = {
        "title": "Poda de arvore",
        "description": "Solicito poda preventiva na avenida principal.",
    }

    _run(validator.validate(demand))

    assert backend_client.calls == []
