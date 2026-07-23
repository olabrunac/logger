from fastapi import APIRouter
from app.api.endpoints import login, media, users

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
