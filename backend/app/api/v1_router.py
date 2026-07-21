from fastapi import APIRouter
from app.api.endpoints import login, media

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
