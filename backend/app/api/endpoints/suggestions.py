import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.api import deps
from app.models.media import MediaType, MediaItem, LogStatus, LogEntry, EpisodeWatched, Achievement
from app.services import tmdb_service, igdb_service, google_books_service
from app.services.hours_service import effective_hours
from app.api.endpoints.search import _tmdb_to_media, _igdb_to_media, _book_to_media

router = APIRouter()

# Cache externo simples com TTL (evita martelar as APIs a cada reload).
_ext_cache: Dict[str, tuple] = {}


def _cached(key: str, ttl: int, producer):
    now = time.time()
    hit = _ext_cache.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    value = producer()
    _ext_cache[key] = (now, value)
    return value


def _genres_of(media: MediaItem) -> List[str]:
    raw = media.genres or media.steam_genres or media.book_categories or ""
    return [g.strip() for g in raw.split(",") if g.strip()]


def _media_brief(media: MediaItem) -> dict:
    return {
        "id": media.id,
        "title": media.title,
        "media_type": media.media_type.value if hasattr(media.media_type, "value") else media.media_type,
        "tmdb_id": media.tmdb_id,
        "igdb_id": media.igdb_id,
        "google_books_id": media.google_books_id,
        "steam_appid": media.steam_appid,
        "cover_image_url": media.cover_image_url.replace("http://", "https://") if media.cover_image_url else None,
        "release_date": media.release_date.isoformat() if media.release_date else None,
        "synopsis": media.synopsis,
    }


def _build_genre_profile(logs: List[LogEntry]) -> Dict[MediaType, Dict[str, dict]]:
    """Perfil de gêneros por tipo de mídia, com peso por status/favorito/nota.
    Chave é o gênero em minúsculo; valor é {"w": peso, "label": nome original}."""
    weights = {
        LogStatus.COMPLETED: 2.0,
        LogStatus.PLATINATED: 2.0,
        LogStatus.IN_PROGRESS: 1.2,
        LogStatus.LIBRARY: 0.7,
        LogStatus.DROPPED: 0.4,
    }
    profile: Dict[MediaType, Dict[str, dict]] = {t: {} for t in MediaType}
    for log in logs:
        if log.status in (LogStatus.WISHLIST, LogStatus.SOON):
            continue
        media = log.media_item
        mt = media.media_type
        w = weights.get(log.status, 1.0)
        if log.is_favorite:
            w += 1.0
        if log.rating is not None and log.rating >= 4:
            w += 0.5
        for g in _genres_of(media):
            key = g.lower()
            entry = profile[mt].get(key)
            if entry is None:
                profile[mt][key] = {"w": w, "label": g}
            else:
                entry["w"] += w
    return profile


def _matched_genres(gmap: Dict[str, dict], media: MediaItem) -> List[str]:
    matched = []
    for g in _genres_of(media):
        if g.lower() in gmap:
            matched.append(gmap[g.lower()]["label"])
    return matched


def _score_for(gmap: Dict[str, dict], media: MediaItem) -> float:
    return sum(gmap[g.lower()]["w"] for g in _genres_of(media) if g.lower() in gmap)


def _logged_external_ids(logs: List[LogEntry]) -> set:
    out = set()
    for log in logs:
        m = log.media_item
        out.add((m.media_type, m.tmdb_id, m.igdb_id, m.google_books_id))
    return out


def _fetch_external(mt: MediaType, genre_name: str) -> List[dict]:
    try:
        if mt == MediaType.MOVIE:
            raw = tmdb_service.discover_media("movie", genre_name, limit=6)
            return [_tmdb_to_media(it, MediaType.MOVIE) for it in raw]
        if mt == MediaType.SERIES:
            raw = tmdb_service.discover_media("tv", genre_name, limit=6)
            return [_tmdb_to_media(it, MediaType.SERIES) for it in raw]
        if mt == MediaType.GAME:
            raw = igdb_service.discover_games(genre_name, limit=6)
            return [_igdb_to_media(it) for it in raw]
        if mt == MediaType.BOOK:
            raw = google_books_service.discover_books(genre_name, max_results=6)
            return [_book_to_media(it) for it in raw]
    except Exception as e:
        print(f"External suggestions error ({mt}, {genre_name}): {e}")
    return []


def _external_suggestions(mt: MediaType, top_genres: List[tuple], logged_ext: set, limit: int = 8) -> List[dict]:
    out: List[dict] = []
    seen = set()
    for label, key, _w in top_genres:
        raw = _cached(f"sugg_ext:{mt.value}:{key}", 1800, lambda g=label: _fetch_external(mt, g))
        for r in raw:
            ext_key = (r.get("media_type"), r.get("tmdb_id"), r.get("igdb_id"), r.get("google_books_id"))
            if ext_key in seen or ext_key in logged_ext:
                continue
            if not r.get("cover_image_url"):
                continue
            seen.add(ext_key)
            out.append({"media": r, "match_genres": [label], "in_wishlist": False, "score": 0})
            if len(out) >= limit:
                break
        if len(out) >= limit:
            break
    return out


def _watched_counts(db: Session, log_ids: List[int]) -> Dict[int, int]:
    if not log_ids:
        return {}
    rows = db.query(EpisodeWatched.log_id, func.count(EpisodeWatched.id)).filter(
        EpisodeWatched.log_id.in_(log_ids),
        EpisodeWatched.watched == True,
        EpisodeWatched.season_number > 0,
    ).group_by(EpisodeWatched.log_id).all()
    return dict(rows)


def _achievement_counts(db: Session, log_ids: List[int]):
    if not log_ids:
        return {}, {}
    unlocked = dict(
        db.query(Achievement.log_id, func.count(Achievement.id))
        .filter(Achievement.log_id.in_(log_ids), Achievement.unlocked == True)
        .group_by(Achievement.log_id).all()
    )
    total = dict(
        db.query(Achievement.log_id, func.count(Achievement.id))
        .filter(Achievement.log_id.in_(log_ids))
        .group_by(Achievement.log_id).all()
    )
    return unlocked, total


def _log_brief(db: Session, log: LogEntry, **extra) -> dict:
    watched_episodes = extra.get("watched_episodes")
    data = {
        "log_id": log.id,
        "status": log.status.value if hasattr(log.status, "value") else log.status,
        "log_date": log.log_date.isoformat() if log.log_date else None,
        "rating": log.rating,
        "is_favorite": log.is_favorite,
        "platform": log.platform,
        "hours_spent": effective_hours(db, log, watched_episodes=watched_episodes),
        "media": _media_brief(log.media_item),
    }
    data.update(extra)
    return data


@router.get("/what-to-do")
def what_to_do(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int = Query(..., ge=1),
) -> Any:
    logs = db.query(LogEntry).filter(LogEntry.user_id == user_id).options(joinedload(LogEntry.media_item)).all()
    logged_ids = {l.media_item_id for l in logs}
    profile = _build_genre_profile(logs)

    top_by_type: Dict[MediaType, List[tuple]] = {}
    all_genres: List[dict] = []
    for mt, gmap in profile.items():
        ranked = sorted(gmap.items(), key=lambda kv: kv[1]["w"], reverse=True)
        top = [(entry["label"], key, entry["w"]) for key, entry in ranked if entry["w"] >= 1.0]
        top_by_type[mt] = top[:4]
        for key, entry in ranked:
            all_genres.append({"genre": entry["label"], "media_type": mt.value, "weight": round(entry["w"], 1)})
    all_genres.sort(key=lambda x: x["weight"], reverse=True)
    genres_out = all_genres[:8]

    # ---- Sugestões (wishlist compatível em primeiro, depois local, depois externo) ----
    wishlist_matches: Dict[MediaType, List[dict]] = {t: [] for t in MediaType}
    for log in logs:
        if log.status not in (LogStatus.WISHLIST, LogStatus.SOON):
            continue
        mt = log.media_item.media_type
        gmap = profile.get(mt, {})
        matched = _matched_genres(gmap, log.media_item)
        if matched and log.media_item.cover_image_url:
            score = _score_for(gmap, log.media_item)
            wishlist_matches[mt].append((score, log.media_item, matched))
    for mt in wishlist_matches:
        wishlist_matches[mt].sort(key=lambda x: x[0], reverse=True)

    local_items = (
        db.query(MediaItem)
        .filter(MediaItem.id.notin_(logged_ids))
        .all()
    ) if logged_ids else db.query(MediaItem).all()
    local_by_type: Dict[MediaType, List[tuple]] = {t: [] for t in MediaType}
    for item in local_items:
        gmap = profile.get(item.media_type, {})
        matched = _matched_genres(gmap, item)
        if matched and item.cover_image_url:
            local_by_type[item.media_type].append((_score_for(gmap, item), item, matched))
    for mt in local_by_type:
        local_by_type[mt].sort(key=lambda x: (x[0], x[1].popularity or 0), reverse=True)

    logged_ext = _logged_external_ids(logs)
    suggestions: List[dict] = []
    for mt in MediaType:
        per_type: List[dict] = []
        for score, media, matched in wishlist_matches[mt]:
            per_type.append({"media": _media_brief(media), "match_genres": matched, "in_wishlist": True, "score": round(score, 2)})
        for score, media, matched in local_by_type[mt]:
            per_type.append({"media": _media_brief(media), "match_genres": matched, "in_wishlist": False, "score": round(score, 2)})
        max_local = 12
        if len(per_type) < max_local and top_by_type[mt]:
            per_type.extend(_external_suggestions(mt, top_by_type[mt], logged_ext, limit=max_local - len(per_type)))
        suggestions.extend(per_type[:max_local])

    # ---- Incompletas (mais fácil de completar primeiro) ----
    series_logs = [
        l for l in logs
        if l.media_item.media_type == MediaType.SERIES and l.status == LogStatus.IN_PROGRESS
    ]
    game_logs = [
        l for l in logs
        if l.media_item.media_type == MediaType.GAME and l.status in (LogStatus.IN_PROGRESS, LogStatus.LIBRARY)
    ]
    book_logs = [
        l for l in logs
        if l.media_item.media_type == MediaType.BOOK and l.status == LogStatus.IN_PROGRESS
    ]

    watched_counts = _watched_counts(db, [l.id for l in series_logs])
    unlocked_counts, total_counts = _achievement_counts(db, [l.id for l in game_logs])

    series_out: List[dict] = []
    for log in series_logs:
        total = log.media_item.total_episodes or 0
        watched = watched_counts.get(log.id, 0)
        remaining = total - watched
        if total <= 0 or remaining <= 0:
            continue
        series_out.append(_log_brief(
            db, log,
            watched_episodes=watched, total_episodes=total, remaining=remaining,
            percent=round(watched / total * 100, 1),
        ))
    series_out.sort(key=lambda x: (x["remaining"], -x["percent"]))

    games_out: List[dict] = []
    for log in game_logs:
        unlocked = unlocked_counts.get(log.id, 0)
        total = total_counts.get(log.id, 0)
        if total <= 0 or unlocked >= total:
            continue
        remaining = total - unlocked
        games_out.append(_log_brief(
            db, log,
            unlocked_achievements=unlocked, total_achievements=total, remaining=remaining,
            percent=round(unlocked / total * 100, 1),
        ))
    games_out.sort(key=lambda x: (-x["percent"], x["remaining"], x["total_achievements"]))

    books_out: List[dict] = []
    for log in book_logs:
        page_count = log.media_item.page_count or 0
        read = log.pages_read or 0
        remaining = page_count - read
        if page_count <= 0 or remaining <= 0:
            continue
        books_out.append(_log_brief(
            db, log,
            pages_read=read, page_count=page_count, remaining=remaining,
            percent=round(read / page_count * 100, 1),
        ))
    books_out.sort(key=lambda x: x["remaining"])

    return {
        "genres": genres_out,
        "suggestions": suggestions,
        "incomplete": {"series": series_out, "games": games_out, "books": books_out},
    }
