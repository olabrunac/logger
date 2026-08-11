from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.crud.base import CRUDBase
from app.models.media import MediaItem, LogEntry, MediaType, LogStatus
from app.schemas.media import MediaItemCreate, MediaItemUpdate, LogEntryCreate, LogEntryUpdate


class CRUDMediaItem(CRUDBase[MediaItem, MediaItemCreate, MediaItemUpdate]):
    def get_or_create(self, db: Session, *, obj_in: MediaItemCreate) -> MediaItem:
        """
        Gets a media item by its external ID (tmdb or igdb) or creates it if it doesn't exist.
        """
        query = db.query(self.model)
        if obj_in.media_type in [MediaType.MOVIE, MediaType.SERIES] and obj_in.tmdb_id:
            existing_item = query.filter(MediaItem.tmdb_id == obj_in.tmdb_id).first()
        elif obj_in.media_type == MediaType.GAME and (obj_in.igdb_id or obj_in.steam_appid):
            existing_item = None
            if obj_in.igdb_id:
                existing_item = query.filter(MediaItem.igdb_id == obj_in.igdb_id).first()
            if not existing_item and obj_in.steam_appid:
                existing_item = query.filter(MediaItem.steam_appid == obj_in.steam_appid).first()
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
        from sqlalchemy.orm import joinedload
        return db.query(self.model).options(
            joinedload(LogEntry.media_item)
        ).filter(
            LogEntry.user_id == user_id,
            LogEntry.status.notin_([LogStatus.WISHLIST, LogStatus.SOON])
        ).order_by(LogEntry.log_date.desc()).offset(skip).limit(limit).all()

    def get_wishlist_by_user(self, db: Session, *, user_id: int):
        from sqlalchemy.orm import joinedload
        return db.query(self.model).options(
            joinedload(LogEntry.media_item)
        ).filter(
            LogEntry.user_id == user_id,
            LogEntry.status.in_([LogStatus.WISHLIST, LogStatus.SOON])
        ).order_by(LogEntry.log_date.desc()).all()

    def get_stats_by_user(self, db: Session, *, user_id: int):
        """Get statistics for a user's logs grouped by media type."""
        non_log_statuses = [LogStatus.WISHLIST, LogStatus.SOON]
        
        # Total logs by media type (excluding wishlist/soon)
        stats = db.query(
            MediaItem.media_type,
            func.count(LogEntry.id).label('count')
        ).join(LogEntry, LogEntry.media_item_id == MediaItem.id)\
         .filter(LogEntry.user_id == user_id, LogEntry.status.notin_(non_log_statuses))\
         .group_by(MediaItem.media_type)\
         .all()
        
        # Favorites count (excluding wishlist/soon)
        favorites = db.query(
            MediaItem.media_type,
            func.count(LogEntry.id).label('count')
        ).join(LogEntry, LogEntry.media_item_id == MediaItem.id)\
         .filter(LogEntry.user_id == user_id, LogEntry.is_favorite == True, LogEntry.status.notin_(non_log_statuses))\
         .group_by(MediaItem.media_type)\
         .all()
        
        # Completed count
        completed = db.query(
            MediaItem.media_type,
            func.count(LogEntry.id).label('count')
        ).join(LogEntry, LogEntry.media_item_id == MediaItem.id)\
         .filter(LogEntry.user_id == user_id, LogEntry.status == LogStatus.COMPLETED)\
         .group_by(MediaItem.media_type)\
         .all()
        
        # Total hours (excluding wishlist/soon) - auto-calc from runtime when manual hours are null
        from sqlalchemy.orm import joinedload
        from app.services.hours_service import effective_hours_batch
        hours_logs = db.query(LogEntry).options(joinedload(LogEntry.media_item)).filter(
            LogEntry.user_id == user_id,
            LogEntry.status.notin_(non_log_statuses),
        ).all()
        hours_map = effective_hours_batch(db, hours_logs)
        hours_by_type: dict = {}
        for log in hours_logs:
            eff = hours_map.get(log.id) or 0
            mt = log.media_item.media_type.value
            hours_by_type[mt] = hours_by_type.get(mt, 0) + eff
        
        # Build result dict
        result = {}
        for media_type in [MediaType.MOVIE, MediaType.SERIES, MediaType.GAME, MediaType.BOOK]:
            key = media_type.value
            result[key] = {
                'total': 0,
                'favorites': 0,
                'completed': 0,
                'hours': 0,
            }
        
        for media_type, count in stats:
            result[media_type.value]['total'] = count
        
        for media_type, count in favorites:
            result[media_type.value]['favorites'] = count
            
        for media_type, count in completed:
            result[media_type.value]['completed'] = count
            
        for media_type, total in hours_by_type.items():
            result[media_type]['hours'] = round(total, 4)
        
        # Add grand totals (soma apenas os dicts por tipo, não os totais já somados)
        type_keys = [mt.value for mt in [MediaType.MOVIE, MediaType.SERIES, MediaType.GAME, MediaType.BOOK]]
        result['total'] = sum(result[k]['total'] for k in type_keys)
        result['favorites'] = sum(result[k]['favorites'] for k in type_keys)
        result['completed'] = sum(result[k]['completed'] for k in type_keys)
        result['hours'] = sum(result[k]['hours'] for k in type_keys)
        
        return result

    def get_favorite_media_by_user(self, db: Session, *, user_id: int, media_type: Optional[MediaType] = None):
        """Get all favorited media items for a user, optionally filtered by media type."""
        query = db.query(MediaItem).join(LogEntry, LogEntry.media_item_id == MediaItem.id)\
            .filter(LogEntry.user_id == user_id, LogEntry.is_favorite == True)\
            .distinct()
        if media_type:
            query = query.filter(MediaItem.media_type == media_type)
        results = query.all()
        print(f"CRUD: user_id={user_id}, media_type={media_type}, found={len(results)}")
        for r in results:
            print(f"  - {r.title} (id={r.id}, type={r.media_type})")
        return results


media_item = CRUDMediaItem(MediaItem)
log_entry = CRUDLogEntry(LogEntry)

