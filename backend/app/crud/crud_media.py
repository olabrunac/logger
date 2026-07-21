from sqlalchemy.orm import Session
from typing import Optional
from app.crud.base import CRUDBase
from app.models.media import MediaItem, LogEntry, MediaType
from app.schemas.media import MediaItemCreate, MediaItemUpdate, LogEntryCreate, LogEntryUpdate

class CRUDMediaItem(CRUDBase[MediaItem, MediaItemCreate, MediaItemUpdate]):
    def get_or_create(self, db: Session, *, obj_in: MediaItemCreate) -> MediaItem:
        """
        Gets a media item by its external ID (tmdb or igdb) or creates it if it doesn't exist.
        """
        query = db.query(self.model)
        if obj_in.media_type in [MediaType.MOVIE, MediaType.SERIES] and obj_in.tmdb_id:
            existing_item = query.filter(MediaItem.tmdb_id == obj_in.tmdb_id).first()
        elif obj_in.media_type == MediaType.GAME and obj_in.igdb_id:
            existing_item = query.filter(MediaItem.igdb_id == obj_in.igdb_id).first()
        else:
            # For books or items without external IDs, we might rely on title/type matching
            existing_item = query.filter(MediaItem.title == obj_in.title, MediaItem.media_type == obj_in.media_type).first()

        if existing_item:
            return existing_item
        
        return self.create(db, obj_in=obj_in)


class CRUDLogEntry(CRUDBase[LogEntry, LogEntryCreate, LogEntryUpdate]):
    def create_with_user(
        self, db: Session, *, obj_in: LogEntryCreate, user_id: int
    ) -> LogEntry:
        """
        Creates a log entry and associates it with a user and a media item.
        """
        # Get or create the media item first
        media_item_crud = CRUDMediaItem(MediaItem)
        media_item = media_item_crud.get_or_create(db, obj_in=obj_in.media_item)

        # Create the log entry
        log_entry_data = obj_in.dict()
        log_entry_data.pop("media_item") # Remove media details from log entry data
        
        db_obj = self.model(**log_entry_data, user_id=user_id, media_item_id=media_item.id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_user(self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100):
        return db.query(self.model).filter(LogEntry.user_id == user_id).offset(skip).limit(limit).all()

media_item = CRUDMediaItem(MediaItem)
log_entry = CRUDLogEntry(LogEntry)

