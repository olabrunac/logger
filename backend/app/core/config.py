import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Logger"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./logger.db")

    # API Keys
    TMDB_API_KEY: str = os.getenv("TMDB_API_KEY")
    IGDB_CLIENT_ID: str = os.getenv("IGDB_CLIENT_ID")
    IGDB_CLIENT_SECRET: str = os.getenv("IGDB_CLIENT_SECRET")
    GOOGLE_BOOKS_API_KEY: str = os.getenv("GOOGLE_BOOKS_API_KEY")
    STEAM_API_KEY: str = os.getenv("STEAM_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
