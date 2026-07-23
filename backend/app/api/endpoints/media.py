from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Any, Optional
from app import crud, schemas
from app.api import deps
from app.services import tmdb_service, igdb_service, google_books_service
from app.models.media import MediaType, LogEntry, EpisodeWatched, Achievement
import datetime

router = APIRouter()

def transform_tmdb_result(item: dict, media_type: MediaType) -> dict:
    is_movie = media_type == MediaType.MOVIE
    release_date_str = item.get("release_date") if is_movie else item.get("first_air_date")
    release_date = None
    if release_date_str:
        try:
            release_date = datetime.datetime.strptime(release_date_str, '%Y-%m-%d').date()
        except ValueError:
            release_date = None
    return {
        "title": item.get("title") if is_movie else item.get("name"),
        "media_type": media_type,
        "tmdb_id": item.get("id"),
        "cover_image_url": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get('poster_path') else None,
        "release_date": release_date,
        "synopsis": item.get("overview"),
    }

def transform_igdb_result(item: dict) -> dict:
    release_date = None
    if item.get("first_release_date"):
        release_date = datetime.datetime.fromtimestamp(item.get("first_release_date")).date()
    cover_url = None
    if item.get("cover") and item["cover"].get("url"):
        cover_url = item["cover"]["url"].replace("t_thumb", "t_cover_big").lstrip("/")
        cover_url = f"https://{cover_url}"
    return {
        "title": item.get("name"),
        "media_type": MediaType.GAME,
        "igdb_id": item.get("id"),
        "cover_image_url": cover_url,
        "release_date": release_date,
        "synopsis": item.get("summary"),
    }

def transform_book_result(item: dict) -> dict:
    vi = item.get("volumeInfo", {})
    release_date = None
    if vi.get("publishedDate"):
        try:
            release_date = datetime.datetime.strptime(vi["publishedDate"][:10], '%Y-%m-%d').date()
        except ValueError:
            try:
                release_date = datetime.datetime.strptime(vi["publishedDate"][:4], '%Y').date()
            except ValueError:
                release_date = None
    image_links = vi.get("imageLinks", {})
    cover_url = image_links.get("thumbnail") or image_links.get("smallThumbnail")
    return {
        "title": vi.get("title", "Sem título"),
        "media_type": MediaType.BOOK,
        "cover_image_url": cover_url,
        "release_date": release_date,
        "synopsis": vi.get("description"),
    }

@router.get("/search", response_model=List[schemas.MediaItemCreate])
def search_media(*, q: str = Query(..., min_length=2), media_type: MediaType, author: Optional[str] = None, year: Optional[int] = None, isbn: Optional[str] = None) -> Any:
    results = []
    if media_type == MediaType.MOVIE:
        raw_results = tmdb_service.search_media(query=q, media_type="movie", year=year)
        results = [transform_tmdb_result(item, MediaType.MOVIE) for item in raw_results]
    elif media_type == MediaType.SERIES:
        raw_results = tmdb_service.search_media(query=q, media_type="tv", year=year)
        results = [transform_tmdb_result(item, MediaType.SERIES) for item in raw_results]
    elif media_type == MediaType.GAME:
        raw_results = igdb_service.search_games(query=q)
        results = [transform_igdb_result(item) for item in raw_results]
        if year:
            results = [r for r in results if r.get("release_date") and r["release_date"].year == year]
    elif media_type == MediaType.BOOK:
        raw_results = google_books_service.search_books(query=q, author=author, year=year, isbn=isbn)
        results = [transform_book_result(item) for item in raw_results]
    return results

@router.post("/logs", response_model=schemas.LogEntryInDB)
def create_log_entry(*, db: Session = Depends(deps.get_db), payload: schemas.LogPayload) -> Any:
    log = crud.log_entry.create_with_user(db=db, obj_in=payload.log_in, user_id=payload.user_id)
    return log

@router.get("/logs", response_model=List[schemas.LogEntryInDB])
def read_logs(*, db: Session = Depends(deps.get_db), user_id: int, skip: int = 0, limit: int = 100) -> Any:
    logs = crud.log_entry.get_multi_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return logs

@router.get("/logs/{log_id}", response_model=schemas.LogEntryInDB)
def read_log(*, db: Session = Depends(deps.get_db), log_id: int) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log

@router.put("/logs/{log_id}", response_model=schemas.LogEntryInDB)
def update_log_entry(*, db: Session = Depends(deps.get_db), log_id: int, payload: schemas.LogPayload) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    update_data = payload.log_in.dict(exclude_unset=True)
    if "media_item" in update_data:
        del update_data["media_item"]
    for field, value in update_data.items():
        setattr(log, field, value)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.patch("/logs/{log_id}", response_model=schemas.LogEntryInDB)
def patch_log_entry(*, db: Session = Depends(deps.get_db), log_id: int, updates: schemas.LogEntryUpdate) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.delete("/logs/{log_id}")
def delete_log_entry(*, db: Session = Depends(deps.get_db), log_id: int) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    crud.log_entry.remove(db, id=log_id)
    return {"detail": "Log deleted successfully"}

@router.get("/stats")
def get_user_stats(*, db: Session = Depends(deps.get_db), user_id: int) -> Any:
    total_logs = db.query(LogEntry).filter(LogEntry.user_id == user_id).count()
    favorites = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.is_favorite == True).count()
    completed = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.status == 'completed').count()
    hours_total = db.query(func.coalesce(func.sum(LogEntry.hours_spent), 0)).filter(LogEntry.user_id == user_id).scalar()
    return {"total_logs": total_logs, "favorites": favorites, "completed": completed, "hours_total": hours_total or 0}

# --- Episodes ---

@router.get("/series/{tmdb_id}/seasons")
def get_series_seasons(tmdb_id: int):
    seasons = tmdb_service.get_tv_seasons(tmdb_id)
    return seasons

@router.get("/series/{tmdb_id}/season/{season_number}/episodes")
def get_series_episodes(tmdb_id: int, season_number: int):
    episodes = tmdb_service.get_tv_season_episodes(tmdb_id, season_number)
    return episodes

@router.get("/logs/{log_id}/episodes", response_model=List[schemas.EpisodeWatchedInDB])
def get_log_episodes(*, db: Session = Depends(deps.get_db), log_id: int):
    episodes = db.query(EpisodeWatched).filter(EpisodeWatched.log_id == log_id).all()
    return episodes

@router.post("/logs/{log_id}/episodes", response_model=schemas.EpisodeWatchedInDB)
def toggle_episode(*, db: Session = Depends(deps.get_db), log_id: int, ep_in: schemas.EpisodeWatchedCreate):
    existing = db.query(EpisodeWatched).filter(
        EpisodeWatched.log_id == log_id,
        EpisodeWatched.season_number == ep_in.season_number,
        EpisodeWatched.episode_number == ep_in.episode_number,
    ).first()
    if existing:
        existing.watched = ep_in.watched
        existing.episode_name = ep_in.episode_name or existing.episode_name
        existing.log_date = ep_in.log_date or existing.log_date
        db.commit()
        db.refresh(existing)
        return existing
    ep = EpisodeWatched(log_id=log_id, **ep_in.dict())
    db.add(ep)
    db.commit()
    db.refresh(ep)
    return ep

# --- Achievements ---

@router.get("/logs/{log_id}/achievements", response_model=List[schemas.AchievementInDB])
def get_log_achievements(*, db: Session = Depends(deps.get_db), log_id: int):
    achievements = db.query(Achievement).filter(Achievement.log_id == log_id).all()
    return achievements

@router.post("/logs/{log_id}/achievements", response_model=schemas.AchievementInDB)
def toggle_achievement(*, db: Session = Depends(deps.get_db), log_id: int, ach_in: schemas.AchievementCreate):
    existing = db.query(Achievement).filter(
        Achievement.log_id == log_id,
        Achievement.external_id == ach_in.external_id,
    ).first()
    if existing:
        existing.unlocked = ach_in.unlocked
        db.commit()
        db.refresh(existing)
        return existing
    ach = Achievement(log_id=log_id, **ach_in.dict())
    db.add(ach)
    db.commit()
    db.refresh(ach)
    return ach

@router.get("/games/{igdb_id}/achievements")
def get_game_achievements_proxy(igdb_id: int):
    achievements = igdb_service.get_game_achievements(igdb_id)
    return achievements

