import enum
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Enum, Text, Date, UniqueConstraint, JSON
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
    LIBRARY = "library"

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
    steam_discount_percent = Column(Integer, nullable=True)
    steam_price_checked_at = Column(DateTime, nullable=True)
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
    total_episodes = Column(Integer, nullable=True)
    time_to_beat = Column(Text, nullable=True)
    similar_games = Column(Text, nullable=True)
    # Google Books enrichment
    page_count = Column(Integer, nullable=True)
    publisher = Column(String, nullable=True)
    book_categories = Column(String, nullable=True)
    book_language = Column(String, nullable=True)
    book_rating = Column(Float, nullable=True)
    authors = Column(JSON, nullable=True)
    popularity = Column(Float, nullable=True)
    logs = relationship("LogEntry", back_populates="media_item")

class LogEntry(Base):
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False, index=True)
    log_date = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    rating = Column(Float, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_relog = Column(Boolean, default=False)
    relog_count = Column(Integer, default=0)
    platform = Column(String, nullable=True)
    hours_spent = Column(Float, nullable=True)
    family_share = Column(Boolean, default=False)
    exclude_from_stats = Column(Boolean, default=False)
    pages_read = Column(Integer, nullable=True)
    review = Column(Text, nullable=True)
    status = Column(Enum(LogStatus), nullable=False)
    user = relationship("User", back_populates="logs")
    media_item = relationship("MediaItem", back_populates="logs")
    episodes = relationship("EpisodeWatched", back_populates="log", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="log", cascade="all, delete-orphan")
    reviews = relationship("LogReview", back_populates="log", cascade="all, delete-orphan")
    replies = relationship("LogReply", back_populates="log", cascade="all, delete-orphan")
    likes = relationship("LogLike", back_populates="log", cascade="all, delete-orphan")

class LogReply(Base):
    __tablename__ = "logreply"
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=True, index=True)
    episode_event_id = Column(Integer, ForeignKey("episodetimelineevent.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    log = relationship("LogEntry", back_populates="replies")
    episode_event = relationship("EpisodeTimelineEvent", back_populates="replies")
    user = relationship("User")

class LogLike(Base):
    __tablename__ = "loglike"
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=True, index=True)
    episode_event_id = Column(Integer, ForeignKey("episodetimelineevent.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    log = relationship("LogEntry", back_populates="likes")
    episode_event = relationship("EpisodeTimelineEvent", back_populates="likes")
    user = relationship("User")
    __table_args__ = (UniqueConstraint("log_id", "user_id", name="uq_loglike_log_user"),)

class EpisodeWatched(Base):
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False, index=True)
    season_number = Column(Integer, nullable=False)
    episode_number = Column(Integer, nullable=False)
    episode_name = Column(String, nullable=True)
    watched = Column(Boolean, default=True)
    log_date = Column(String, nullable=True)
    air_date = Column(String, nullable=True)
    review_text = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)
    log = relationship("LogEntry", back_populates="episodes")

class EpisodeTimelineEvent(Base):
    __tablename__ = "episodetimelineevent"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False, index=True)
    season_number = Column(Integer, nullable=False)
    episode_start = Column(Integer, nullable=False)
    episode_end = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False, default="watched")  # watched | reviewed
    review_text = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    user = relationship("User")
    media_item = relationship("MediaItem")
    log = relationship("LogEntry")
    replies = relationship("LogReply", back_populates="episode_event", cascade="all, delete-orphan")
    likes = relationship("LogLike", back_populates="episode_event", cascade="all, delete-orphan")


class Achievement(Base):
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False, index=True)
    external_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    unlocked = Column(Boolean, default=False)
    log = relationship("LogEntry", back_populates="achievements")


class LogReview(Base):
    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=False, index=True)
    review_text = Column(Text, nullable=True)
    rating = Column(Float, nullable=True)
    platform = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    log = relationship("LogEntry", back_populates="reviews")


class TopListItem(Base):
    __tablename__ = "top_list_item"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False, index=True)
    position = Column(Integer, nullable=False)  # 1 to 5
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="top_list_items")
    media_item = relationship("MediaItem")


class CustomList(Base):
    __tablename__ = "custom_list"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="custom_lists")
    items = relationship("CustomListItem", back_populates="custom_list", cascade="all, delete-orphan", order_by="CustomListItem.position")


class CustomListItem(Base):
    __tablename__ = "custom_list_item"
    id = Column(Integer, primary_key=True, index=True)
    custom_list_id = Column(Integer, ForeignKey("custom_list.id"), nullable=False, index=True)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=False, index=True)
    position = Column(Integer, nullable=False, default=0)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    custom_list = relationship("CustomList", back_populates="items")
    media_item = relationship("MediaItem")
