from fastapi import FastAPI

from app.api.routes import router
from app.config import get_settings


settings = get_settings()

app = FastAPI(title=settings.app_name)
app.include_router(router)
