from fastapi import FastAPI
from app.core.config import settings
from app.api.v1_router import api_router
from app.db.session import engine
from app.db.base import Base
from app.db.init_db import init_db

def create_tables():
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.on_event("startup")
def on_startup():
    create_tables()
    init_db()

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Logger API"}

