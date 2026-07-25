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
    steam_appid = Column(Integer, unique=True, nullable=True)
    google_books_id = Column(String, nullable=True)
    cover_image_url = Column(String, nullable=True)
    release_date = Column(Date, nullable=True)
    synopsis = Column(Text, nullable=True)
    seasons_data = Column(Text, nullable=True)
    # Steam / Game fields
    header_image = Column(String, nullable=True)
    metacritic_score = Column(Integer, nullable=True)
    steam_genres = Column(String, nullable=True)
    steam_categories = Column(String, nullable=True)
    steam_price = Column(String, nullable=True)
    screenshots = Column(Text, nullable=True)
    pc_requirements = Column(Text, nullable=True)
    short_description = Column(Text, nullable=True)
    # TMDb enrichment (movies + series)
    backdrop_url = Column(String, nullable=True)
    genres = Column(String, nullable=True)
    runtime = Column(Integer, nullable=True)
    vote_average = Column(Float, nullable=True)
    director = Column(String, nullable=True)
    trailer_url = Column(String, nullable=True)
    cast = Column(String, nullable=True)
    # Google Books enrichment
    page_count = Column(Integer, nullable=True)
    publisher = Column(String, nullable=True)
    book_categories = Column(String, nullable=True)
    book_language = Column(String, nullable=True)
    book_rating = Column(Float, nullable=True)
    logs = relationship("LogEntry", back_populates="media_item")

class LogEntry(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False)
    log_date = Column(DateTime, default=datetime.datetime.utcnow)
    rating = Column(Float, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_relog = Column(Boolean, default=False)
    relog_count = Column(Integer, default=0)
    platform = Column(String, nullable=True)
    hours_spent = Column(Float, nullable=True)
    pages_read = Column(Integer, nullable=True)
    review = Column(Text, nullable=True)
    status = Column(Enum(LogStatus), nullable=False)
    user = relationship("User", back_populates="logs")
    media_item = relationship("MediaItem", back_populates="logs")
    episodes = relationship("EpisodeWatched", back_populates="log", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="log", cascade="all, delete-orphan")
    reviews = relationship("LogReview", back_populates="log", cascade="all, delete-orphan")

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


class LogReview(Base):
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False)
    review_text = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)
    platform = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    log = relationship("LogEntry", back_populates="reviews")


class TopListItem(Base):
    __tablename__ = "top_list_item"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False)
    position = Column(Integer, nullable=False)  # 1 to 5
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="top_list_items")
    media_item = relationship("MediaItem")


class CustomList(Base):
    __tablename__ = "custom_list"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="custom_lists")
    items = relationship("CustomListItem", back_populates="custom_list", cascade="all, delete-orphan", order_by="CustomListItem.position")


class CustomListItem(Base):
    __tablename__ = "custom_list_item"
    id = Column(Integer, primary_key=True, index=True)
    custom_list_id = Column(Integer, ForeignKey("custom_list.id"), nullable=False)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    custom_list = relationship("CustomList", back_populates="items")
    media_item = relationship("MediaItem")
