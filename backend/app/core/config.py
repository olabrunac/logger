from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Logger"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "sqlite:///./logger.db"

    # API Keys
    TMDB_API_KEY: Optional[str] = None
    IGDB_CLIENT_ID: Optional[str] = None
    IGDB_CLIENT_SECRET: Optional[str] = None
    GOOGLE_BOOKS_API_KEY: Optional[str] = None
    STEAM_API_KEY: str = ""

    class Config:
        case_sensitive = True

settings = Settings()
