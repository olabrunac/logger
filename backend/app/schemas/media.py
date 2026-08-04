from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.models.media import MediaType, LogStatus

# --- Media Schemas ---
class MediaItemBase(BaseModel):
    title: str
    media_type: MediaType
    tmdb_id: Optional[int] = None
    igdb_id: Optional[int] = None
    google_books_id: Optional[str] = None
    steam_appid: Optional[int] = None
    cover_image_url: Optional[str] = None
    release_date: Optional[date] = None
    synopsis: Optional[str] = None

class MediaItemCreate(MediaItemBase):
    pass

class MediaItemUpdate(MediaItemBase):
    pass

class MediaItemInDB(MediaItemBase):
    id: int
    steam_appid: Optional[int] = None
    header_image: Optional[str] = None
    metacritic_score: Optional[int] = None
    steam_genres: Optional[str] = None
    steam_categories: Optional[str] = None
    steam_price: Optional[str] = None
    screenshots: Optional[str] = None
    pc_requirements: Optional[str] = None
    short_description: Optional[str] = None
    backdrop_url: Optional[str] = None
    genres: Optional[str] = None
    runtime: Optional[int] = None
    vote_average: Optional[float] = None
    director: Optional[str] = None
    trailer_url: Optional[str] = None
    cast: Optional[str] = None
    page_count: Optional[int] = None
    publisher: Optional[str] = None
    book_categories: Optional[str] = None
    book_language: Optional[str] = None
    book_rating: Optional[float] = None
    time_to_beat: Optional[str] = None
    similar_games: Optional[str] = None
    class Config:
        from_attributes = True

# --- Top List Schemas ---
class TopListItemBase(BaseModel):
    media_item_id: int
    position: int  # 1 to 5

class TopListItemCreate(TopListItemBase):
    pass

class TopListItemUpdate(BaseModel):
    position: Optional[int] = None

class TopListItemInDB(TopListItemBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    media_item: Optional["MediaItemInDB"] = None
    class Config:
        from_attributes = True

TopListItemInDB.model_rebuild()

# --- Log Schemas ---
class LogEntryBase(BaseModel):
    log_date: Optional[datetime] = datetime.now()
    rating: Optional[float] = None
    is_favorite: Optional[bool] = False
    is_relog: Optional[bool] = False
    relog_count: Optional[int] = 0
    platform: Optional[str] = None
    hours_spent: Optional[float] = None
    pages_read: Optional[int] = None
    review: Optional[str] = None
    status: LogStatus

class LogEntryCreate(LogEntryBase):
    media_item: MediaItemCreate

class LogEntryUpdate(BaseModel):
    log_date: Optional[datetime] = None
    rating: Optional[float] = None
    is_favorite: Optional[bool] = None
    is_relog: Optional[bool] = None
    relog_count: Optional[int] = None
    platform: Optional[str] = None
    hours_spent: Optional[float] = None
    pages_read: Optional[int] = None
    review: Optional[str] = None
    status: Optional[LogStatus] = None

class LogEntryInDB(LogEntryBase):
    id: int
    user_id: int
    media_item: MediaItemInDB
    class Config:
        from_attributes = True

class LogPayload(BaseModel):
    log_in: LogEntryCreate
    user_id: int

# --- Episode Schemas ---
class EpisodeWatchedBase(BaseModel):
    season_number: int
    episode_number: int
    episode_name: Optional[str] = None
    watched: bool = True
    log_date: Optional[str] = None
    air_date: Optional[str] = None
    review_text: Optional[str] = None
    rating: Optional[float] = None

class EpisodeWatchedCreate(EpisodeWatchedBase):
    pass

class EpisodeWatchedInDB(EpisodeWatchedBase):
    id: int
    log_id: int
    class Config:
        from_attributes = True

class EpisodeReviewUpdate(BaseModel):
    review_text: Optional[str] = None
    rating: Optional[float] = None

# --- Achievement Schemas ---
class AchievementBase(BaseModel):
    external_id: str
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    unlocked: bool = False

class AchievementCreate(AchievementBase):
    pass

class AchievementInDB(AchievementBase):
    id: int
    log_id: int
    class Config:
        from_attributes = True


# --- LogReview Schemas ---
class LogReviewBase(BaseModel):
    review_text: Optional[str] = None
    rating: Optional[float] = None
    platform: Optional[str] = None

class LogReviewCreate(LogReviewBase):
    pass

class LogReviewInDB(LogReviewBase):
    id: int
    log_id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Log with computed stats ---
class LogEntryWithStats(LogEntryInDB):
    watched_episodes: Optional[int] = None
    total_episodes: Optional[int] = None
    unlocked_achievements: Optional[int] = None
    total_achievements: Optional[int] = None


# --- Custom List Schemas ---
class CustomListBase(BaseModel):
    name: str
    description: Optional[str] = None

class CustomListCreate(CustomListBase):
    pass

class CustomListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CustomListItemBase(BaseModel):
    media_item_id: int
    position: int = 0

class CustomListItemCreate(BaseModel):
    media_item_id: Optional[int] = None
    media_item: Optional[MediaItemCreate] = None
    position: int = 0

class CustomListItemUpdate(BaseModel):
    position: Optional[int] = None

class CustomListItemInDB(CustomListItemBase):
    id: int
    custom_list_id: int
    added_at: datetime
    media_item: Optional[MediaItemInDB] = None
    class Config:
        from_attributes = True

class CustomListInDB(CustomListBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    items: List[CustomListItemInDB] = []
    class Config:
        from_attributes = True

CustomListInDB.model_rebuild()


