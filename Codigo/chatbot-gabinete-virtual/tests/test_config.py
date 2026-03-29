from pathlib import Path

from app.config import Settings


def test_settings_load_env_from_project_root() -> None:
    settings = Settings()
    project_root = Path(__file__).resolve().parent.parent

    assert settings.model_config.get("env_file") == project_root / ".env"
