import enum
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Enum, Text, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime

class MediaType(str, enum.Enum):
    MOVIE = "movie"
    SERIES = "series"
    GAME = "game"
    BOOK = "book"

class LogStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"
    WISHLIST = "wishlist"
    SOON = "soon"
    PLATINATED = "platinated"

class MediaItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    media_type = Column(Enum(MediaType), nullable=False)
    tmdb_id = Column(Integer, unique=True, nullable=True)
    igdb_id = Column(Integer, unique=True, nullable=True)
    cover_image_url = Column(String, nullable=True)
    release_date = Column(Date, nullable=True)
    synopsis = Column(Text, nullable=True)
    seasons_data = Column(Text, nullable=True)
    logs = relationship("LogEntry", back_populates="media_item")

class LogEntry(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False)
    log_date = Column(DateTime, default=datetime.datetime.utcnow)
    rating = Column(Float, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_relog = Column(Boolean, default=False)
    platform = Column(String, nullable=True)
    hours_spent = Column(Float, nullable=True)
    review = Column(Text, nullable=True)
    status = Column(Enum(LogStatus), nullable=False)
    user = relationship("User", back_populates="logs")
    media_item = relationship("MediaItem", back_populates="logs")
    episodes = relationship("EpisodeWatched", back_populates="log", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="log", cascade="all, delete-orphan")

class EpisodeWatched(Base):
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False)
    season_number = Column(Integer, nullable=False)
    episode_number = Column(Integer, nullable=False)
    episode_name = Column(String, nullable=True)
    watched = Column(Boolean, default=True)
    log_date = Column(String, nullable=True)
    log = relationship("LogEntry", back_populates="episodes")

class Achievement(Base):
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False)
    external_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    unlocked = Column(Boolean, default=False)
    log = relationship("LogEntry", back_populates="achievements")
