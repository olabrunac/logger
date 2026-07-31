from typing import Optional

from sqlalchemy.orm import Session

from app.models.media import LogEntry, MediaType, EpisodeWatched


def effective_hours(db: Session, log: LogEntry) -> Optional[float]:
    """Horas efetivas de um log: manual `hours_spent` se definido, senão
    calculadas automaticamente a partir do runtime da mídia (filmes/séries)."""
    if log.hours_spent is not None:
        return log.hours_spent
    media = log.media_item
    if not media or not media.runtime:
        return None
    if media.media_type == MediaType.MOVIE:
        return round(media.runtime / 60, 1)
    if media.media_type == MediaType.SERIES:
        watched = db.query(EpisodeWatched).filter(
            EpisodeWatched.log_id == log.id,
            EpisodeWatched.watched == True,
        ).count()
        if watched > 0:
            return round((media.runtime / 60) * watched, 1)
    return None


def total_effective_hours(db: Session, logs) -> float:
    return round(sum(effective_hours(db, log) or 0 for log in logs), 1)
