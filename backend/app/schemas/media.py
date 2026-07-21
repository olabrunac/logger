from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from app.models.media import MediaType, LogStatus

# --- Media Schemas ---
class MediaItemBase(BaseModel):
    title: str
    media_type: MediaType
    tmdb_id: Optional[int] = None
    igdb_id: Optional[int] = None
    cover_image_url: Optional[str] = None
    release_date: Optional[date] = None
    synopsis: Optional[str] = None

class MediaItemCreate(MediaItemBase):
    pass

class MediaItemUpdate(MediaItemBase):
    pass

class MediaItemInDB(MediaItemBase):
    id: int
    class Config:
        from_attributes = True

# --- Log Schemas ---
class LogEntryBase(BaseModel):
    log_date: Optional[datetime] = datetime.now()
    rating: Optional[float] = None
    is_favorite: Optional[bool] = False
    is_relog: Optional[bool] = False
    platform: Optional[str] = None
    hours_spent: Optional[int] = None
    review: Optional[str] = None
    status: LogStatus

class LogEntryCreate(LogEntryBase):
    # Instead of media_item_id, we pass the full details
    # This allows the API to get-or-create the media item
    media_item: MediaItemCreate

class LogEntryUpdate(LogEntryBase):
    pass

class LogEntryInDB(LogEntryBase):
    id: int
    user_id: int
    media_item: MediaItemInDB

    class Config:
        from_attributes = True

# --- Payload Schemas ---
class LogPayload(BaseModel):
    log_in: LogEntryCreate
    user_id: int


