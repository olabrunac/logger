from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Any
from app import crud, schemas
from app.api import deps
from app.services import tmdb_service, igdb_service
from app.models.media import MediaType
import datetime

router = APIRouter()

def transform_tmdb_result(item: dict, media_type: MediaType) -> dict:
    """Transforms a TMDb result into our MediaItem schema."""
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
    """Transforms an IGDB result into our MediaItem schema."""
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

@router.get("/search", response_model=List[schemas.MediaItemCreate])
def search_media(
    *,
    q: str = Query(..., min_length=2),
    media_type: MediaType,
) -> Any:
    """
    Search for media items from external APIs (TMDb, IGDB).
    """
    results = []
    if media_type == MediaType.MOVIE:
        raw_results = tmdb_service.search_media(query=q, media_type="movie")
        results = [transform_tmdb_result(item, MediaType.MOVIE) for item in raw_results]
    elif media_type == MediaType.SERIES:
        raw_results = tmdb_service.search_media(query=q, media_type="tv")
        results = [transform_tmdb_result(item, MediaType.SERIES) for item in raw_results]
    elif media_type == MediaType.GAME:
        raw_results = igdb_service.search_games(query=q)
        results = [transform_igdb_result(item) for item in raw_results]
    else:
        # Placeholder for books
        pass
        
    return results

@router.post("/logs", response_model=schemas.LogEntryInDB)
def create_log_entry(
    *,
    db: Session = Depends(deps.get_db),
    payload: schemas.LogPayload
) -> Any:
    """
    Create a new log entry for a user.
    """
    log = crud.log_entry.create_with_user(
        db=db, obj_in=payload.log_in, user_id=payload.user_id
    )
    return log

@router.get("/logs", response_model=List[schemas.LogEntryInDB])
def read_logs(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve logs for a user.
    """
    logs = crud.log_entry.get_multi_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return logs

