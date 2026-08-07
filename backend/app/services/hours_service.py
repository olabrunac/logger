from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.media import LogEntry, MediaType, EpisodeWatched


def effective_hours(db: Session, log: LogEntry, watched_episodes: Optional[int] = None) -> Optional[float]:
    """Horas efetivas de um log: manual `hours_spent` se definido, senão
    calculadas automaticamente a partir do runtime da mídia (filmes/séries).
    `watched_episodes` evita query extra quando a contagem já foi obtida."""
    if log.hours_spent is not None:
        return log.hours_spent
    media = log.media_item
    if not media or not media.runtime:
        return None
    if media.media_type == MediaType.MOVIE:
        return round(media.runtime / 60, 1)
    if media.media_type == MediaType.SERIES:
        if watched_episodes is None:
            watched = db.query(EpisodeWatched).filter(
                EpisodeWatched.log_id == log.id,
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            ).count()
        else:
            watched = watched_episodes
        if watched > 0:
            return round((media.runtime / 60) * watched, 1)
    return None


def total_effective_hours(db: Session, logs) -> float:
    return round(sum(effective_hours(db, log) or 0 for log in logs), 1)


def effective_hours_batch(db: Session, logs: List[LogEntry]) -> Dict[int, Optional[float]]:
    """Calcula horas efetivas de vários logs com uma única query para séries
    (evita 1 COUNT de EpisodeWatched por log no loop)."""
    series_ids = [
        log.id for log in logs
        if log.media_item
        and log.media_item.media_type == MediaType.SERIES
        and log.hours_spent is None
        and log.media_item.runtime
    ]
    watched: Dict[int, int] = {}
    if series_ids:
        from sqlalchemy import func
        rows = (
            db.query(EpisodeWatched.log_id, func.count())
            .filter(
                EpisodeWatched.log_id.in_(series_ids),
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            )
            .group_by(EpisodeWatched.log_id)
            .all()
        )
        watched = {log_id: count for log_id, count in rows}
    return {log.id: effective_hours(db, log, watched.get(log.id)) for log in logs}
