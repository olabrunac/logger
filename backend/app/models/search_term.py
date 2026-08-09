from sqlalchemy import Column, Integer, String, DateTime
from app.db.base import Base
import datetime


class SearchTerm(Base):
    __tablename__ = "searchterm"

    id = Column(Integer, primary_key=True, index=True)
    term = Column(String, unique=True, index=True, nullable=False)
    count = Column(Integer, default=1, nullable=False)
    last_searched_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Referência da mídia clicada, para renderizar poster-tile nos recentes/populares
    media_type = Column(String, nullable=True)
    tmdb_id = Column(Integer, nullable=True)
    igdb_id = Column(Integer, nullable=True)
    google_books_id = Column(String, nullable=True)
    steam_appid = Column(Integer, nullable=True)
    cover_image_url = Column(String, nullable=True)
