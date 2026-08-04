from fastapi import APIRouter
from app.api.endpoints import login, media, users, posts, badges, notifications, import_data, search

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(badges.router, prefix="/badges", tags=["badges"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(import_data.router, prefix="/import", tags=["import"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
