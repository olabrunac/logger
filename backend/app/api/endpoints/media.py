from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Any, Optional
from app import crud, schemas
from app.crud import crud_top_list, crud_custom_list
from app.api import deps
from app.services import tmdb_service, igdb_service, google_books_service, steam_service
from app.services.hours_service import effective_hours
from app.models.media import MediaType, MediaItem, LogStatus, LogEntry, LogReview, EpisodeWatched, Achievement, TopListItem
import datetime

router = APIRouter()

def _levenshtein(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (c1 != c2)))
        prev = curr
    return prev[-1]

def _fuzzy_score(query: str, title: str) -> float:
    q = query.lower().strip()
    t = title.lower().strip()
    if q == t:
        return 1.0
    if t.startswith(q):
        return 0.95
    if q in t:
        return 0.85
    if q.split()[0] in t if q.split() else False:
        return 0.7
    lev = _levenshtein(q, t)
    max_len = max(len(q), len(t))
    if max_len == 0:
        return 1.0
    ratio = 1.0 - (lev / max_len)
    return max(ratio, 0.0)

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
        "google_books_id": item.get("id"),
    }

@router.get("/search", response_model=List[schemas.MediaItemCreate])
def search_media(*, db: Session = Depends(deps.get_db), q: str = Query("", min_length=0), media_type: MediaType, author: Optional[str] = None, year: Optional[int] = None, isbn: Optional[str] = None) -> Any:
    results = []
    if media_type == MediaType.MOVIE:
        raw_results = tmdb_service.search_media(query=q or "a", media_type="movie", year=year)
        results = [transform_tmdb_result(item, MediaType.MOVIE) for item in raw_results]
    elif media_type == MediaType.SERIES:
        raw_results = tmdb_service.search_media(query=q or "a", media_type="tv", year=year)
        results = [transform_tmdb_result(item, MediaType.SERIES) for item in raw_results]
    elif media_type == MediaType.GAME:
        raw_results = igdb_service.search_games(query=q or "a")
        results = [transform_igdb_result(item) for item in raw_results]
        if year:
            results = [r for r in results if r.get("release_date") and r["release_date"].year == year]
    elif media_type == MediaType.BOOK:
        raw_results = google_books_service.search_books(query=q or "a", author=author, year=year, isbn=isbn)
        results = [transform_book_result(item) for item in raw_results]
        if not results and q.strip():
            raw_results2 = google_books_service.search_books(query=q, author=author, year=year, isbn=isbn, use_intitle=False)
            results = [transform_book_result(item) for item in raw_results2]

    if q.strip():
        local_items = db.query(MediaItem).filter(
            MediaItem.media_type == media_type,
            MediaItem.title.ilike(f"%{q}%")
        ).limit(10).all()
        local_results = []
        seen_titles = {r.get("title", "").lower() for r in results}
        for item in local_items:
            if item.title.lower() not in seen_titles:
                local_results.append({
                    "title": item.title,
                    "media_type": item.media_type,
                    "tmdb_id": item.tmdb_id,
                    "igdb_id": item.igdb_id,
                    "google_books_id": item.google_books_id,
                    "cover_image_url": item.cover_image_url,
                    "release_date": item.release_date.isoformat() if item.release_date else None,
                    "synopsis": item.synopsis,
                    "id": item.id,
                })
                seen_titles.add(item.title.lower())
        results = local_results + results

    if q.strip():
        results.sort(key=lambda r: _fuzzy_score(q, r.get("title", "")), reverse=True)

    return results

@router.post("/logs", response_model=schemas.LogEntryInDB)
def create_log_entry(*, db: Session = Depends(deps.get_db), payload: schemas.LogPayload) -> Any:
    new_status = payload.log_in.status
    user_id = payload.user_id

    # Resolve media_item_id WITHOUT creating a log entry yet
    from app.crud.crud_media import CRUDMediaItem, media_item as media_item_crud_singleton
    media_item_crud = CRUDMediaItem(MediaItem)
    media_item = media_item_crud.get_or_create(db, obj_in=payload.log_in.media_item)
    media_id = media_item.id

    # Find existing non-wishlist entry (priority)
    existing_log = db.query(LogEntry).filter(
        LogEntry.user_id == user_id,
        LogEntry.media_item_id == media_id,
        LogEntry.status.notin_([LogStatus.WISHLIST, LogStatus.SOON]),
    ).first()

    # Find existing wishlist entry
    existing_wishlist = db.query(LogEntry).filter(
        LogEntry.user_id == user_id,
        LogEntry.media_item_id == media_id,
        LogEntry.status.in_([LogStatus.WISHLIST, LogStatus.SOON]),
    ).first()

    # CASE 1: New log is wishlist
    if new_status in [LogStatus.WISHLIST, LogStatus.SOON]:
        # If already has a wishlist, deduplicate
        if existing_wishlist:
            existing_wishlist.log_date = datetime.datetime.utcnow()
            db.commit()
            db.refresh(existing_wishlist)
            return existing_wishlist
        # Otherwise create the wishlist entry
        log_entry_data = payload.log_in.dict()
        log_entry_data.pop("media_item")
        log = LogEntry(**log_entry_data, user_id=user_id, media_item_id=media_id)
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    # CASE 2: New log is non-wishlist (completed/in_progress/dropped)
    # Remove ALL wishlist entries for this media
    if existing_wishlist:
        db.delete(existing_wishlist)

    if existing_log:
        # Merge: increment relog_count and update fields
        existing_log.relog_count = (existing_log.relog_count or 0) + 1
        existing_log.status = LogStatus(new_status)
        if payload.log_in.rating:
            existing_log.rating = payload.log_in.rating
        if payload.log_in.hours_spent:
            existing_log.hours_spent = (existing_log.hours_spent or 0) + payload.log_in.hours_spent
        if payload.log_in.pages_read:
            existing_log.pages_read = (existing_log.pages_read or 0) + payload.log_in.pages_read
        if payload.log_in.platform:
            existing_log.platform = payload.log_in.platform
        if payload.log_in.review:
            existing_log.review = payload.log_in.review
        existing_log.log_date = datetime.datetime.utcnow()

        # Save a review snapshot for this relog
        review_entry = LogReview(
            log_id=existing_log.id,
            review_text=payload.log_in.review,
            rating=payload.log_in.rating,
            platform=payload.log_in.platform,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(review_entry)

        # Clean up any other duplicate non-wishlist entries for this user+media
        other_duplicates = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_id,
            LogEntry.id != existing_log.id,
            LogEntry.status.notin_([LogStatus.WISHLIST, LogStatus.SOON]),
        ).all()
        for dup in other_duplicates:
            db.delete(dup)

        db.commit()
        db.refresh(existing_log)
        log = existing_log
    else:
        # First time logging this media — create new entry
        log_entry_data = payload.log_in.dict()
        log_entry_data.pop("media_item")
        log = LogEntry(**log_entry_data, user_id=user_id, media_item_id=media_id)
        db.add(log)
        db.flush()

        # Save initial review snapshot
        review_entry = LogReview(
            log_id=log.id,
            review_text=payload.log_in.review,
            rating=payload.log_in.rating,
            platform=payload.log_in.platform,
            created_at=log.log_date or datetime.datetime.utcnow(),
        )
        db.add(review_entry)
        db.commit()
        db.refresh(log)

    # Enrich game logs with Steam data
    try:
        if log.media_item.media_type == MediaType.GAME and log.media_item.igdb_id:
            igdb_id = log.media_item.igdb_id
            steam_appid = igdb_service.get_steam_appid(igdb_id)
            if steam_appid:
                log.media_item.steam_appid = steam_appid
                steam_data = steam_service.get_app_details(steam_appid)
                if steam_data:
                    parsed = steam_service.parse_steam_game_data(steam_data)
                    for key, value in parsed.items():
                        if value:
                            setattr(log.media_item, key, value)
                db.add(log.media_item)
                db.commit()
                db.refresh(log)

        # Enrich movie logs with TMDb data
        if log.media_item.media_type == MediaType.MOVIE and log.media_item.tmdb_id:
            details = tmdb_service.get_movie_details(log.media_item.tmdb_id)
            if details:
                for key, value in details.items():
                    if value:
                        setattr(log.media_item, key, value)
                db.add(log.media_item)
                db.commit()

        # Enrich series logs with TMDb data
        if log.media_item.media_type == MediaType.SERIES and log.media_item.tmdb_id:
            details = tmdb_service.get_tv_details(log.media_item.tmdb_id)
            if details:
                for key, value in details.items():
                    if value:
                        setattr(log.media_item, key, value)
                db.add(log.media_item)
                db.commit()

        # Enrich book logs with Google Books data
        if log.media_item.media_type == MediaType.BOOK and log.media_item.google_books_id:
            details = google_books_service.get_book_details(log.media_item.google_books_id)
            if details:
                for key, value in details.items():
                    if value:
                        setattr(log.media_item, key, value)
                db.add(log.media_item)
                db.commit()
    except Exception as e:
        print(f"Enrichment error (non-fatal): {e}")
        db.rollback()

    # Auto-calc hours_spent from runtime if not manually set
    if log.hours_spent is None and log.media_item.runtime:
        if log.media_item.media_type == MediaType.MOVIE:
            log.hours_spent = round(log.media_item.runtime / 60, 1)
        elif log.media_item.media_type == MediaType.SERIES:
            watched = db.query(EpisodeWatched).filter(
                EpisodeWatched.log_id == log.id,
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            ).count()
            if watched > 0:
                log.hours_spent = round((log.media_item.runtime / 60) * watched, 1)
        db.add(log)
        db.commit()

    try:
        from app.crud.crud_user_badge import check_and_unlock
        check_and_unlock(db, user_id)
    except Exception:
        pass

    return log

@router.get("/logs", response_model=List[schemas.LogEntryWithStats])
def read_logs(*, db: Session = Depends(deps.get_db), user_id: int, skip: int = 0, limit: int = 100) -> Any:
    from sqlalchemy import func as sa_func
    logs = crud.log_entry.get_multi_by_user(db, user_id=user_id, skip=skip, limit=limit)
    log_ids = [log.id for log in logs]
    series_ids = [log.id for log in logs if log.media_item.media_type == MediaType.SERIES]
    game_ids = [log.id for log in logs if log.media_item.media_type == MediaType.GAME]

    watched_counts: dict[int, int] = {}
    if series_ids:
        rows = (
            db.query(EpisodeWatched.log_id, sa_func.count())
            .filter(
                EpisodeWatched.log_id.in_(series_ids),
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            )
            .group_by(EpisodeWatched.log_id)
            .all()
        )
        watched_counts = {log_id: count for log_id, count in rows}

    unlocked_counts: dict[int, int] = {}
    total_achievement_counts: dict[int, int] = {}
    if game_ids:
        rows_unlocked = (
            db.query(Achievement.log_id, sa_func.count())
            .filter(Achievement.log_id.in_(game_ids), Achievement.unlocked == True)
            .group_by(Achievement.log_id)
            .all()
        )
        unlocked_counts = {log_id: count for log_id, count in rows_unlocked}
        rows_total = (
            db.query(Achievement.log_id, sa_func.count())
            .filter(Achievement.log_id.in_(game_ids))
            .group_by(Achievement.log_id)
            .all()
        )
        total_achievement_counts = {log_id: count for log_id, count in rows_total}

    results = []
    for log in logs:
        stats = {"watched_episodes": None, "total_episodes": None, "unlocked_achievements": None, "total_achievements": None}
        if log.media_item.media_type == MediaType.SERIES:
            stats["watched_episodes"] = watched_counts.get(log.id, 0)
            stats["total_episodes"] = log.media_item.total_episodes
        elif log.media_item.media_type == MediaType.GAME:
            stats["unlocked_achievements"] = unlocked_counts.get(log.id, 0)
            stats["total_achievements"] = total_achievement_counts.get(log.id, 0)
        log_dict = schemas.LogEntryInDB.model_validate(log).model_dump()
        log_dict.update(stats)
        log_dict["hours_spent"] = effective_hours(db, log, watched_counts.get(log.id))
        results.append(schemas.LogEntryWithStats(**log_dict))
    return results

@router.get("/logs/by-item", response_model=schemas.LogEntryWithStats)
def read_log_by_item(*, db: Session = Depends(deps.get_db), user_id: int, media_type: str, api_id: str) -> Any:
    from sqlalchemy import or_
    try:
        mt = MediaType(media_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid media type")
    api_num = int(api_id) if api_id.isdigit() else None
    conditions = [MediaItem.google_books_id == api_id]
    if api_num is not None:
        conditions += [MediaItem.tmdb_id == api_num, MediaItem.igdb_id == api_num, MediaItem.steam_appid == api_num]
    media_item = db.query(MediaItem).filter(MediaItem.media_type == mt, or_(*conditions)).first()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media item not found")
    log = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.media_item_id == media_item.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    stats = {"watched_episodes": None, "total_episodes": None, "unlocked_achievements": None, "total_achievements": None}
    if log.media_item.media_type == MediaType.SERIES:
        watched = db.query(EpisodeWatched).filter(EpisodeWatched.log_id == log.id, EpisodeWatched.watched == True, EpisodeWatched.season_number > 0).count()
        stats["watched_episodes"] = watched
        stats["total_episodes"] = log.media_item.total_episodes
    elif log.media_item.media_type == MediaType.GAME:
        unlocked = db.query(Achievement).filter(Achievement.log_id == log.id, Achievement.unlocked == True).count()
        total = db.query(Achievement).filter(Achievement.log_id == log.id).count()
        stats["unlocked_achievements"] = unlocked
        stats["total_achievements"] = total
    log_dict = schemas.LogEntryInDB.model_validate(log).model_dump()
    log_dict.update(stats)
    log_dict["hours_spent"] = effective_hours(db, log)
    return schemas.LogEntryWithStats(**log_dict)

@router.get("/logs/{log_id}", response_model=schemas.LogEntryWithStats)
def read_log(*, db: Session = Depends(deps.get_db), log_id: int) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    # Enrich media item if release_date is missing
    try:
        mi = log.media_item
        if mi.media_type == MediaType.SERIES and mi.tmdb_id and not mi.release_date:
            details = tmdb_service.get_tv_details(mi.tmdb_id)
            if details:
                for key, value in details.items():
                    if value:
                        setattr(mi, key, value)
                db.add(mi)
                db.commit()
        elif mi.media_type == MediaType.MOVIE and mi.tmdb_id and not mi.release_date:
            details = tmdb_service.get_movie_details(mi.tmdb_id)
            if details:
                for key, value in details.items():
                    if value:
                        setattr(mi, key, value)
                db.add(mi)
                db.commit()
    except Exception:
        db.rollback()
    stats = {"watched_episodes": None, "total_episodes": None, "unlocked_achievements": None, "total_achievements": None}
    if log.media_item.media_type == MediaType.SERIES:
        watched = db.query(EpisodeWatched).filter(EpisodeWatched.log_id == log.id, EpisodeWatched.watched == True, EpisodeWatched.season_number > 0).count()
        stats["watched_episodes"] = watched
        stats["total_episodes"] = log.media_item.total_episodes
    elif log.media_item.media_type == MediaType.GAME:
        unlocked = db.query(Achievement).filter(Achievement.log_id == log.id, Achievement.unlocked == True).count()
        total = db.query(Achievement).filter(Achievement.log_id == log.id).count()
        stats["unlocked_achievements"] = unlocked
        stats["total_achievements"] = total
    log_dict = schemas.LogEntryInDB.model_validate(log).model_dump()
    log_dict.update(stats)
    log_dict["hours_spent"] = effective_hours(db, log)
    return schemas.LogEntryWithStats(**log_dict)

@router.get("/logs/{log_id}/reviews", response_model=List[schemas.LogReviewInDB])
def read_log_reviews(*, db: Session = Depends(deps.get_db), log_id: int) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    reviews = db.query(LogReview).filter(LogReview.log_id == log_id).order_by(LogReview.created_at.desc()).all()
    return reviews


@router.post("/logs/reviews-batch")
def read_logs_reviews_batch(*, db: Session = Depends(deps.get_db), log_ids: List[int]) -> Any:
    if not log_ids:
        return {}
    reviews = (
        db.query(LogReview)
        .filter(LogReview.log_id.in_(log_ids))
        .order_by(LogReview.created_at.desc())
        .all()
    )
    result: dict[int, list] = {lid: [] for lid in log_ids}
    for r in reviews:
        result[r.log_id].append(schemas.LogReviewInDB.model_validate(r).model_dump())
    return result

@router.put("/logs/{log_id}", response_model=schemas.LogEntryInDB)
def update_log_entry(*, db: Session = Depends(deps.get_db), log_id: int, updates: schemas.LogEntryUpdate) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    update_data = updates.dict(exclude_unset=True)

    # Auto-increment: when a wishlist entry becomes completed/in_progress/dropped,
    # merge it into the existing log for the same media item
    new_status = update_data.get('status')
    is_wishlist_entry = log.status in [LogStatus.WISHLIST, LogStatus.SOON]
    is_becoming_log = new_status and new_status not in ['wishlist', 'soon']

    if is_wishlist_entry and is_becoming_log:
        # Remove other wishlist entries for this media
        wishlist_entries = db.query(LogEntry).filter(
            LogEntry.user_id == log.user_id,
            LogEntry.media_item_id == log.media_item_id,
            LogEntry.status.in_([LogStatus.WISHLIST, LogStatus.SOON]),
            LogEntry.id != log.id,
        ).all()
        for w in wishlist_entries:
            db.delete(w)

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == log.user_id,
            LogEntry.media_item_id == log.media_item_id,
            LogEntry.id != log.id,
            LogEntry.status.notin_([LogStatus.WISHLIST, LogStatus.SOON])
        ).first()

        if existing_log:
            existing_log.relog_count = (existing_log.relog_count or 0) + 1
            if new_status == 'completed':
                existing_log.status = LogStatus.COMPLETED
            elif new_status == 'in_progress':
                existing_log.status = LogStatus.IN_PROGRESS
            elif new_status == 'dropped':
                existing_log.status = LogStatus.DROPPED
            elif new_status == 'platinated':
                existing_log.status = LogStatus.PLATINATED
            if update_data.get('rating'):
                existing_log.rating = update_data['rating']
            if update_data.get('hours_spent'):
                existing_log.hours_spent = (existing_log.hours_spent or 0) + update_data['hours_spent']
            if update_data.get('platform'):
                existing_log.platform = update_data['platform']
            if update_data.get('review'):
                existing_log.review = update_data['review']
            existing_log.log_date = datetime.datetime.utcnow()

            review_entry = LogReview(
                log_id=existing_log.id,
                review_text=update_data.get('review'),
                rating=update_data.get('rating'),
                platform=update_data.get('platform'),
                created_at=datetime.datetime.utcnow(),
            )
            db.add(review_entry)
            db.add(existing_log)
            db.delete(log)
            db.commit()
            db.refresh(existing_log)
            try:
                from app.crud.crud_user_badge import check_and_unlock
                check_and_unlock(db, existing_log.user_id)
            except Exception:
                pass
            return existing_log

    # Save a review snapshot only if review content actually changed
    new_review = update_data.get('review')
    new_rating = update_data.get('rating')
    new_platform = update_data.get('platform')
    review_changed = (
        (new_review is not None and new_review != log.review) or
        (new_rating is not None and new_rating != log.rating) or
        (new_platform is not None and new_platform != log.platform)
    )
    if review_changed:
        review_entry = LogReview(
            log_id=log.id,
            review_text=new_review if new_review is not None else log.review,
            rating=new_rating if new_rating is not None else log.rating,
            platform=new_platform if new_platform is not None else log.platform,
            created_at=datetime.datetime.utcnow(),
        )
        db.add(review_entry)

    for field, value in update_data.items():
        setattr(log, field, value)
    db.add(log)
    db.commit()
    db.refresh(log)

    # If status changed to non-wishlist, remove any wishlist entries for this media
    if new_status and new_status not in ['wishlist', 'soon']:
        wishlist_entries = db.query(LogEntry).filter(
            LogEntry.user_id == log.user_id,
            LogEntry.media_item_id == log.media_item_id,
            LogEntry.status.in_([LogStatus.WISHLIST, LogStatus.SOON]),
        ).all()
        for w in wishlist_entries:
            db.delete(w)
        if wishlist_entries:
            db.commit()
            db.refresh(log)

    # Enrich game logs with Steam data if not already present
    if log.media_item.media_type == MediaType.GAME and log.media_item.igdb_id and not log.media_item.steam_appid:
        igdb_id = log.media_item.igdb_id
        steam_appid = igdb_service.get_steam_appid(igdb_id)
        if steam_appid:
            log.media_item.steam_appid = steam_appid
            steam_data = steam_service.get_app_details(steam_appid)
            if steam_data:
                parsed = steam_service.parse_steam_game_data(steam_data)
                for key, value in parsed.items():
                    if value:
                        setattr(log.media_item, key, value)
            db.add(log.media_item)
            db.commit()
            db.refresh(log)

    # Enrich movie logs with TMDb data if not already present
    if log.media_item.media_type == MediaType.MOVIE and log.media_item.tmdb_id and not log.media_item.genres:
        details = tmdb_service.get_movie_details(log.media_item.tmdb_id)
        if details:
            for key, value in details.items():
                if value:
                    setattr(log.media_item, key, value)
            db.add(log.media_item)
            db.commit()

    # Enrich series logs with TMDb data if not already present
    if log.media_item.media_type == MediaType.SERIES and log.media_item.tmdb_id and not log.media_item.genres:
        details = tmdb_service.get_tv_details(log.media_item.tmdb_id)
        if details:
            for key, value in details.items():
                if value:
                    setattr(log.media_item, key, value)
            db.add(log.media_item)
            db.commit()

    # Enrich book logs with Google Books data if not already present
    if log.media_item.media_type == MediaType.BOOK and log.media_item.google_books_id and not log.media_item.publisher:
        details = google_books_service.get_book_details(log.media_item.google_books_id)
        if details:
            for key, value in details.items():
                if value:
                    setattr(log.media_item, key, value)
            db.add(log.media_item)
            db.commit()

    # Auto-calc hours_spent from runtime if not manually set
    if log.hours_spent is None and log.media_item.runtime:
        if log.media_item.media_type == MediaType.MOVIE:
            log.hours_spent = round(log.media_item.runtime / 60, 1)
        elif log.media_item.media_type == MediaType.SERIES:
            watched = db.query(EpisodeWatched).filter(
                EpisodeWatched.log_id == log.id,
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            ).count()
            if watched > 0:
                log.hours_spent = round((log.media_item.runtime / 60) * watched, 1)
        db.add(log)
        db.commit()

    try:
        from app.crud.crud_user_badge import check_and_unlock
        check_and_unlock(db, log.user_id)
    except Exception:
        pass

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
    try:
        from app.crud.crud_user_badge import check_and_unlock
        check_and_unlock(db, log.user_id)
    except Exception:
        pass
    return log

@router.post("/users/{user_id}/backfill-hours")
def backfill_hours(*, db: Session = Depends(deps.get_db), user_id: int) -> Any:
    logs = db.query(LogEntry).filter(
        LogEntry.user_id == user_id,
        LogEntry.hours_spent.is_(None),
    ).all()
    updated = 0
    for log in logs:
        if not log.media_item.runtime:
            continue
        if log.media_item.media_type == MediaType.MOVIE:
            log.hours_spent = round(log.media_item.runtime / 60, 1)
            updated += 1
        elif log.media_item.media_type == MediaType.SERIES:
            watched = db.query(EpisodeWatched).filter(
                EpisodeWatched.log_id == log.id,
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            ).count()
            if log.media_item.runtime and watched > 0:
                log.hours_spent = round((log.media_item.runtime / 60) * watched, 1)
                updated += 1
        db.add(log)
    db.commit()
    return {"updated": updated}

@router.delete("/logs/{log_id}")
def delete_log_entry(*, db: Session = Depends(deps.get_db), log_id: int) -> Any:
    log = crud.log_entry.get(db, id=log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    crud.log_entry.remove(db, id=log_id)
    return {"detail": "Log deleted successfully"}

@router.get("/stats")
def get_user_stats(*, db: Session = Depends(deps.get_db), user_id: int) -> Any:
    non_log = ['wishlist', 'soon']
    total_logs = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.status.notin_(non_log)).count()
    favorites = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.is_favorite == True, LogEntry.status.notin_(non_log)).count()
    completed = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.status == 'completed').count()
    stats_logs = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.status.notin_(non_log)).all()
    hours_total = sum(effective_hours(db, log) or 0 for log in stats_logs)
    wishlist_count = db.query(LogEntry).filter(LogEntry.user_id == user_id, LogEntry.status.in_(non_log)).count()
    return {"total_logs": total_logs, "favorites": favorites, "completed": completed, "hours_total": round(hours_total, 1), "wishlist": wishlist_count}

@router.get("/wishlist", response_model=List[schemas.LogEntryInDB])
def get_wishlist(*, db: Session = Depends(deps.get_db), user_id: int, media_type: Optional[str] = None) -> Any:
    logs = crud.log_entry.get_wishlist_by_user(db, user_id=user_id)
    if media_type:
        logs = [l for l in logs if l.media_item.media_type.value == media_type]
    return logs

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
    log = db.query(LogEntry).filter(LogEntry.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    if ep_in.watched and ep_in.air_date:
        try:
            air = datetime.datetime.strptime(ep_in.air_date[:10], "%Y-%m-%d")
            if air > datetime.datetime.now():
                raise HTTPException(status_code=400, detail="Cannot mark future episode as watched")
        except ValueError:
            pass

    existing = db.query(EpisodeWatched).filter(
        EpisodeWatched.log_id == log_id,
        EpisodeWatched.season_number == ep_in.season_number,
        EpisodeWatched.episode_number == ep_in.episode_number,
    ).first()
    if existing:
        existing.watched = ep_in.watched
        existing.episode_name = ep_in.episode_name or existing.episode_name
        existing.log_date = ep_in.log_date or existing.log_date
        if ep_in.air_date:
            existing.air_date = ep_in.air_date
        db.commit()
        db.refresh(existing)
        _update_series_status(db, log)
        return existing
    ep = EpisodeWatched(log_id=log_id, **ep_in.dict())
    db.add(ep)
    db.commit()
    db.refresh(ep)
    _update_series_status(db, log)
    return ep


def _update_series_status(db: Session, log: LogEntry):
    if log.media_item.media_type != MediaType.SERIES:
        return
    total_eps = log.media_item.total_episodes or 0
    watched_eps = db.query(EpisodeWatched).filter(
        EpisodeWatched.log_id == log.id,
        EpisodeWatched.watched == True,
        EpisodeWatched.season_number > 0,
    ).count()
    if total_eps > 0 and watched_eps >= total_eps:
        log.status = LogStatus.COMPLETED
    elif watched_eps > 0:
        log.status = LogStatus.IN_PROGRESS
    # Auto-calc hours from runtime x watched episodes
    if log.media_item.runtime and watched_eps > 0:
        log.hours_spent = round((log.media_item.runtime / 60) * watched_eps, 1)
    db.add(log)
    db.commit()


@router.put("/episodes/{episode_id}/review", response_model=schemas.EpisodeWatchedInDB)
def update_episode_review(
    *, db: Session = Depends(deps.get_db), episode_id: int, review_in: schemas.EpisodeReviewUpdate,
    user_id: int = Query(...),
):
    ep = db.query(EpisodeWatched).filter(EpisodeWatched.id == episode_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    log = db.query(LogEntry).filter(LogEntry.id == ep.log_id).first()
    if not log or log.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your log")
    if review_in.review_text is not None:
        ep.review_text = review_in.review_text
    if review_in.rating is not None:
        ep.rating = review_in.rating
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
    steam_appid = igdb_service.get_steam_appid(igdb_id)
    if not steam_appid:
        return []
    return igdb_service.get_steam_achievements(steam_appid)


# --- Top Lists ---
@router.get("/users/{user_id}/top-list", response_model=List[schemas.TopListItemInDB])
def get_user_top_list(*, db: Session = Depends(deps.get_db), user_id: int):
    """Get user's top 5 lists for all media types"""
    items = crud_top_list.get_user_top_list(db=db, user_id=user_id)
    return items


@router.post("/users/{user_id}/top-list", response_model=schemas.TopListItemInDB)
def create_top_list_item(*, db: Session = Depends(deps.get_db), user_id: int, item_in: schemas.TopListItemCreate):
    """Add item to user's top 5 list"""
    # Get media item type for per-type position check
    media_item = db.query(MediaItem).filter(MediaItem.id == item_in.media_item_id).first()
    if not media_item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Media item not found")

    # Check if position is already taken for this user + media type
    existing = db.query(TopListItem).join(MediaItem, TopListItem.media_item_id == MediaItem.id).filter(
        TopListItem.user_id == user_id,
        TopListItem.position == item_in.position,
        MediaItem.media_type == media_item.media_type
    ).first()
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Position {item_in.position} is already taken for this media type")
    
    # Check if media item already in user's top list
    existing_media = db.query(TopListItem).filter(
        TopListItem.user_id == user_id,
        TopListItem.media_item_id == item_in.media_item_id
    ).first()
    if existing_media:
        raise HTTPException(status_code=400, detail="This media item is already in your top list")
    
    item = TopListItem(user_id=user_id, **item_in.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/users/{user_id}/top-list/{item_id}", response_model=schemas.TopListItemInDB)
def update_top_list_item(*, db: Session = Depends(deps.get_db), user_id: int, item_id: int, item_in: schemas.TopListItemUpdate):
    """Update top list item (reorder)"""
    item = db.query(TopListItem).filter(TopListItem.id == item_id, TopListItem.user_id == user_id).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item_in.position is not None:
        # Check if new position is taken for this media type
        media_item = db.query(MediaItem).filter(MediaItem.id == item.media_item_id).first()
        existing = db.query(TopListItem).join(MediaItem, TopListItem.media_item_id == MediaItem.id).filter(
            TopListItem.user_id == user_id,
            TopListItem.position == item_in.position,
            TopListItem.id != item_id,
            MediaItem.media_type == media_item.media_type
        ).first()
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail=f"Position {item_in.position} is already taken")
    
    for field, value in item_in.dict(exclude_unset=True).items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/users/{user_id}/top-list/{item_id}")
def delete_top_list_item(*, db: Session = Depends(deps.get_db), user_id: int, item_id: int):
    """Remove item from top list"""
    item = db.query(TopListItem).filter(TopListItem.id == item_id, TopListItem.user_id == user_id).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Item removed from top list"}


@router.post("/users/{user_id}/top-list/reorder")
def reorder_top_list(*, db: Session = Depends(deps.get_db), user_id: int, items: list[schemas.TopListItemUpdate]):
    """Bulk reorder top list items"""
    for item_in in items:
        if item_in.position is not None:
            item = db.query(TopListItem).filter(TopListItem.id == item_in.id, TopListItem.user_id == user_id).first()
            if item:
                item.position = item_in.position
    db.commit()
    return {"message": "Top list reordered successfully"}


@router.get("/users/{user_id}/favorites", response_model=List[schemas.MediaItemInDB])
def get_user_favorites(*, db: Session = Depends(deps.get_db), user_id: int, media_type: MediaType = Query(...)):
    """Get user's favorited media items for a specific media type (must be logged AND favorited)"""
    print(f"[DEBUG] Getting favorites for user {user_id}, media_type: {media_type} (type: {type(media_type)})")
    favorites = crud.log_entry.get_favorite_media_by_user(db, user_id=user_id, media_type=media_type)
    print(f"[DEBUG] Found {len(favorites)} favorites")
    for f in favorites:
        print(f"  - {f.title} (type={f.media_type}, id={f.id})")
    return [schemas.MediaItemInDB.model_validate(fav.__dict__) for fav in favorites]


# --- Custom Lists ---

@router.get("/users/{user_id}/custom-lists", response_model=List[schemas.CustomListInDB])
def get_user_custom_lists(*, db: Session = Depends(deps.get_db), user_id: int):
    return crud_custom_list.get_user_lists(db, user_id=user_id)


@router.get("/users/{user_id}/custom-lists/{list_id}", response_model=schemas.CustomListInDB)
def get_custom_list(*, db: Session = Depends(deps.get_db), user_id: int, list_id: int):
    lst = crud_custom_list.get_list(db, list_id=list_id, user_id=user_id)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    return lst


@router.post("/users/{user_id}/custom-lists", response_model=schemas.CustomListInDB)
def create_custom_list(*, db: Session = Depends(deps.get_db), user_id: int, obj_in: schemas.CustomListCreate):
    return crud_custom_list.create_list(db, user_id=user_id, obj_in=obj_in)


@router.put("/users/{user_id}/custom-lists/{list_id}", response_model=schemas.CustomListInDB)
def update_custom_list(*, db: Session = Depends(deps.get_db), user_id: int, list_id: int, obj_in: schemas.CustomListUpdate):
    lst = crud_custom_list.update_list(db, list_id=list_id, user_id=user_id, obj_in=obj_in)
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    return lst


@router.delete("/users/{user_id}/custom-lists/{list_id}")
def delete_custom_list(*, db: Session = Depends(deps.get_db), user_id: int, list_id: int):
    if not crud_custom_list.delete_list(db, list_id=list_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="List not found")
    return {"detail": "List deleted"}


@router.post("/users/{user_id}/custom-lists/{list_id}/items", response_model=schemas.CustomListItemInDB)
def add_custom_list_item(*, db: Session = Depends(deps.get_db), user_id: int, list_id: int, obj_in: schemas.CustomListItemCreate):
    item = crud_custom_list.add_item(db, list_id=list_id, user_id=user_id, obj_in=obj_in)
    if item is None:
        raise HTTPException(status_code=404, detail="List not found")
    from app.models.media import CustomListItem as CustomListItemModel
    db_item = db.query(CustomListItemModel).options(
        joinedload(CustomListItemModel.media_item)
    ).filter(CustomListItemModel.id == item.id).first()
    return db_item


@router.delete("/users/{user_id}/custom-lists/{list_id}/items/{item_id}")
def remove_custom_list_item(*, db: Session = Depends(deps.get_db), user_id: int, list_id: int, item_id: int):
    if not crud_custom_list.remove_item(db, list_id=list_id, item_id=item_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Item not found")
    return {"detail": "Item removed"}


@router.post("/users/{user_id}/custom-lists/{list_id}/reorder")
def reorder_custom_list_items(*, db: Session = Depends(deps.get_db), user_id: int, list_id: int, item_ids: list[int]):
    if not crud_custom_list.reorder_items(db, list_id=list_id, user_id=user_id, item_ids=item_ids):
        raise HTTPException(status_code=404, detail="List not found")
    return {"detail": "Reordered"}

