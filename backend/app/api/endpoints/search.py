from typing import Any, Dict, List, Optional, Set
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import schemas
from app.api import deps
from app.models.media import MediaType, MediaItem, LogEntry
from app.models.user import User
from app.models.search_term import SearchTerm
from app.services import tmdb_service, igdb_service, google_books_service
import datetime
import math

router = APIRouter()

# Type hints for the global search: `#filme`, `#serie`, `#jogo`, `#livro` (singular/plural)
TYPE_FILTER_ALIASES: Dict[str, MediaType] = {
    "filme": MediaType.MOVIE,
    "filmes": MediaType.MOVIE,
    "movie": MediaType.MOVIE,
    "movies": MediaType.MOVIE,
    "serie": MediaType.SERIES,
    "series": MediaType.SERIES,
    "show": MediaType.SERIES,
    "shows": MediaType.SERIES,
    "tv": MediaType.SERIES,
    "jogo": MediaType.GAME,
    "jogos": MediaType.GAME,
    "game": MediaType.GAME,
    "games": MediaType.GAME,
    "livro": MediaType.BOOK,
    "livros": MediaType.BOOK,
    "book": MediaType.BOOK,
    "books": MediaType.BOOK,
}


def _extract_type_filter(query: str) -> tuple[Optional[MediaType], str]:
    """Extract a `#tipo` tag (e.g. `#serie`) from the query and return (media_type, cleaned_query)."""
    words = query.split()
    media_type: Optional[MediaType] = None
    kept = []
    for w in words:
        if w.startswith("#"):
            alias = w[1:].strip().lower()
            t = TYPE_FILTER_ALIASES.get(alias)
            if t is not None:
                media_type = t
                continue
        kept.append(w)
    return media_type, " ".join(kept)


def _fuzzy_score(query: str, title: str) -> float:
    q = query.lower().strip()
    t = title.lower().strip()
    if not q or not t:
        return 0.0
    if q == t:
        return 1.0
    if t.startswith(q):
        return 0.95
    if q in t:
        return 0.85
    if q.split()[0] in t if q.split() else False:
        return 0.7
    lev = 0
    s1, s2 = q, t
    if len(s1) < len(s2):
        s1, s2 = s2, s1
    if len(s2) == 0:
        return 0.0
    prev = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (c1 != c2)))
        prev = curr
    lev = prev[-1]
    max_len = max(len(q), len(t))
    ratio = 1.0 - (lev / max_len) if max_len else 1.0
    return max(ratio, 0.0)


def _serialize_media(item: MediaItem, db: Session, user_id: Optional[int]) -> dict:
    has_log = False
    if user_id is not None:
        has_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id, LogEntry.media_item_id == item.id
        ).first() is not None
    return {
        "id": item.id,
        "title": item.title,
        "media_type": item.media_type,
        "tmdb_id": item.tmdb_id,
        "igdb_id": item.igdb_id,
        "google_books_id": item.google_books_id,
        "steam_appid": item.steam_appid,
        "cover_image_url": item.cover_image_url,
        "release_date": item.release_date.isoformat() if item.release_date else None,
        "synopsis": item.synopsis,
        "has_log": has_log,
        "is_local": True,
        "popularity": 0,
        "authors": None,
    }


def _serialize_user(user: User, db: Session) -> dict:
    from app.crud import crud_follow
    data = schemas.User.model_validate(user).model_dump()
    data["followers_count"] = crud_follow.get_follower_count(db, user.id)
    data["following_count"] = crud_follow.get_following_count(db, user.id)
    return data


def _tmdb_to_media(item: dict, media_type: MediaType) -> dict:
    is_movie = media_type == MediaType.MOVIE
    release_date = None
    rdate = item.get("release_date") if is_movie else item.get("first_air_date")
    if rdate:
        try:
            release_date = datetime.datetime.strptime(rdate, '%Y-%m-%d').date().isoformat()
        except ValueError:
            release_date = None
    return {
        "id": None,
        "title": item.get("title") if is_movie else item.get("name"),
        "media_type": media_type,
        "tmdb_id": item.get("id"),
        "igdb_id": None,
        "google_books_id": None,
        "steam_appid": None,
        "cover_image_url": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get('poster_path') else None,
        "release_date": release_date,
        "synopsis": item.get("overview"),
        "has_log": False,
        "is_local": False,
        "popularity": float(item.get("popularity") or 0),
        "authors": None,
    }


def _igdb_to_media(item: dict) -> dict:
    release_date = None
    if item.get("first_release_date"):
        try:
            release_date = datetime.datetime.fromtimestamp(item["first_release_date"]).date().isoformat()
        except (ValueError, OSError, TypeError, OverflowError):
            release_date = None
    cover_url = None
    if item.get("cover") and item["cover"].get("url"):
        cover_url = item["cover"]["url"].replace("t_thumb", "t_cover_big").lstrip("/")
        cover_url = f"https://{cover_url}"
    return {
        "id": None,
        "title": item.get("name"),
        "media_type": MediaType.GAME,
        "tmdb_id": None,
        "igdb_id": item.get("id"),
        "google_books_id": None,
        "steam_appid": None,
        "cover_image_url": cover_url,
        "release_date": release_date,
        "synopsis": item.get("summary"),
        "has_log": False,
        "is_local": False,
        "popularity": float(item.get("rating_count") or 0),
        "authors": None,
    }


def _book_to_media(item: dict) -> dict:
    vi = item.get("volumeInfo", {})
    release_date = None
    if vi.get("publishedDate"):
        try:
            release_date = datetime.datetime.strptime(vi["publishedDate"][:10], '%Y-%m-%d').date().isoformat()
        except ValueError:
            try:
                release_date = datetime.datetime.strptime(vi["publishedDate"][:4], '%Y').date().isoformat()
            except ValueError:
                release_date = None
    image_links = vi.get("imageLinks", {})
    cover_url = image_links.get("thumbnail") or image_links.get("smallThumbnail")
    if cover_url and cover_url.startswith("http://"):
        cover_url = "https://" + cover_url[7:]
    return {
        "id": None,
        "title": vi.get("title", "Sem título"),
        "media_type": MediaType.BOOK,
        "tmdb_id": None,
        "igdb_id": None,
        "google_books_id": item.get("id"),
        "steam_appid": None,
        "cover_image_url": cover_url,
        "release_date": release_date,
        "synopsis": vi.get("description"),
        "has_log": False,
        "is_local": False,
        "popularity": float(vi.get("ratingsCount") or 0),
        "authors": vi.get("authors") or [],
    }


def _merge_existing(db: Session, results: List[dict], user_id: Optional[int]) -> List[dict]:
    """For external results that already exist in DB, replace with the local record."""
    merged: List[dict] = []
    for r in results:
        mt = r.get("media_type")
        item = None
        if mt == MediaType.MOVIE or mt == MediaType.SERIES:
            tmdb_id = r.get("tmdb_id")
            if tmdb_id is not None:
                item = db.query(MediaItem).filter(MediaItem.media_type == mt, MediaItem.tmdb_id == tmdb_id).first()
        elif mt == MediaType.GAME:
            igdb_id = r.get("igdb_id")
            if igdb_id is not None:
                item = db.query(MediaItem).filter(MediaItem.media_type == mt, MediaItem.igdb_id == igdb_id).first()
        elif mt == MediaType.BOOK:
            gid = r.get("google_books_id")
            if gid:
                item = db.query(MediaItem).filter(MediaItem.media_type == mt, MediaItem.google_books_id == gid).first()
        if item:
            merged.append(_serialize_media(item, db, user_id))
        else:
            merged.append(r)
    return merged


@router.get("")
def global_search(
    *,
    db: Session = Depends(deps.get_db),
    q: str = Query("", min_length=0, max_length=100),
    user_id: Optional[int] = Query(None),
) -> Any:
    query = q.strip()
    only_users = query.startswith("@")
    query = query.lstrip("@").strip()
    type_filter, query = _extract_type_filter(query)
    media_results: List[dict] = []
    user_results: List[dict] = []

    if query:
        if not only_users:
            local_query = db.query(MediaItem)
            if type_filter is not None:
                local_query = local_query.filter(MediaItem.media_type == type_filter)
            items = local_query.filter(MediaItem.title.ilike(f"%{query}%")).limit(50).all()
            local_results = [_serialize_media(i, db, user_id) for i in items]
            external_results: List[dict] = []

            if type_filter in (None, MediaType.MOVIE):
                try:
                    raw_movies = tmdb_service.search_media(query=query, media_type="movie") or []
                    external_results += [_tmdb_to_media(it, MediaType.MOVIE) for it in raw_movies[:5]]
                except Exception:
                    pass

            if type_filter in (None, MediaType.SERIES):
                try:
                    raw_tv = tmdb_service.search_media(query=query, media_type="tv") or []
                    external_results += [_tmdb_to_media(it, MediaType.SERIES) for it in raw_tv[:5]]
                except Exception:
                    pass

            if type_filter in (None, MediaType.GAME):
                try:
                    raw_games = igdb_service.search_games(query=query) or []
                    external_results += [_igdb_to_media(it) for it in raw_games[:5]]
                except Exception:
                    pass

            if type_filter in (None, MediaType.BOOK):
                try:
                    raw_books = google_books_service.search_books(query=query) or []
                    external_results += [_book_to_media(it) for it in raw_books[:5]]
                except Exception:
                    pass

            external_results = _merge_existing(db, external_results, user_id)

            by_key: Dict[tuple, dict] = {}
            for r in local_results + external_results:
                key = (r.get("media_type"), r.get("id"), r.get("tmdb_id"), r.get("igdb_id"), r.get("google_books_id"))
                if key in by_key:
                    continue
                by_key[key] = r

            media_results = list(by_key.values())
            media_results.sort(
                key=lambda r: (
                    _fuzzy_score(query, r.get("title") or ""),
                    r.get("is_local", False),
                    math.log1p(float(r.get("popularity") or 0)),
                ),
                reverse=True,
            )
            media_results = media_results[:15]

        users = db.query(User).filter(
            (User.username.ilike(f"%{query}%")) | (User.display_name.ilike(f"%{query}%"))
        ).limit(20).all()
        user_results = [_serialize_user(u, db) for u in users]
        user_results.sort(key=lambda r: _fuzzy_score(query, r.get("display_name") or r.get("username") or ""), reverse=True)
        user_results = user_results[:8]

    return {"media": media_results, "users": user_results}


class TrackSearchRequest(BaseModel):
    query: str


@router.get("/popular")
def popular_searches(*, db: Session = Depends(deps.get_db)) -> List[str]:
    terms = (
        db.query(SearchTerm.term)
        .filter(func.length(SearchTerm.term) >= 3)
        .order_by(SearchTerm.count.desc(), SearchTerm.last_searched_at.desc())
        .limit(10)
        .all()
    )
    return [t[0] for t in terms]


@router.post("/track")
def track_search(*, db: Session = Depends(deps.get_db), payload: TrackSearchRequest) -> dict:
    q = payload.query.strip()
    if len(q) < 2:
        return {"ok": True}
    term = db.query(SearchTerm).filter(SearchTerm.term == q).first()
    if term:
        term.count += 1
        term.last_searched_at = datetime.datetime.utcnow()
    else:
        db.add(SearchTerm(term=q, count=1))
    db.commit()
    return {"ok": True}
