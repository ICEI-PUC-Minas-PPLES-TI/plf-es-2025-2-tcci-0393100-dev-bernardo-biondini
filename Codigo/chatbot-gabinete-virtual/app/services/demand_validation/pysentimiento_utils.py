from typing import Any


def normalize_label(label: Any) -> str:
    return str(label).lower().strip()


def normalize_scores(probas: Any) -> dict[str, float]:
    if not isinstance(probas, dict):
        return {}

    normalized_scores: dict[str, float] = {}

    for label, score in probas.items():
        try:
            normalized_scores[normalize_label(label)] = float(score)
        except (TypeError, ValueError):
            continue

    return normalized_scores
