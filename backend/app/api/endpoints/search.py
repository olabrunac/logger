from typing import Any, Dict, List, Optional
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


def _serialize_media(item: MediaItem, db: Session, user_id: Optional[int], has_log: bool = False) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "media_type": item.media_type,
        "tmdb_id": item.tmdb_id,
        "igdb_id": item.igdb_id,
        "google_books_id": item.google_books_id,
        "steam_appid": item.steam_appid,
        "cover_image_url": item.cover_image_url.replace("http://", "https://") if item.cover_image_url else None,
        "release_date": item.release_date.isoformat() if item.release_date else None,
        "synopsis": item.synopsis,
        "has_log": has_log,
        "is_local": True,
        "popularity": 0,
        "authors": None,
    }


def _batch_has_logs(db: Session, user_id: Optional[int], items: List[MediaItem]) -> dict:
    if user_id is None or not items:
        return {}
    ids = [i.id for i in items]
    rows = db.query(LogEntry.media_item_id).filter(
        LogEntry.user_id == user_id,
        LogEntry.media_item_id.in_(ids),
    ).all()
    return {r[0] for r in rows}


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
    cover_url = google_books_service._cover_url(vi)
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
    found: List[MediaItem] = []
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
            found.append(item)
    has_logs = _batch_has_logs(db, user_id, found)
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
            merged.append(_serialize_media(item, db, user_id, has_log=(item.id in has_logs)))
        else:
            merged.append(r)
    return merged


@router.get("")
def global_search(
    *,
    db: Session = Depends(deps.get_db),
    q: str = Query("", min_length=0, max_length=100),
    user_id: Optional[int] = Query(None),
    media_type: Optional[MediaType] = Query(None),
    author: Optional[str] = Query(None, max_length=100),
    year: Optional[int] = Query(None, ge=1800, le=datetime.date.today().year + 1),
    isbn: Optional[str] = Query(None, max_length=20),
) -> Any:
    query = q.strip()
    only_users = query.startswith("@")
    query = query.lstrip("@").strip()
    type_filter = media_type
    media_results: List[dict] = []
    user_results: List[dict] = []

    if query or isbn or author or year:
        if not only_users:
            local_results: List[dict] = []
            external_results: List[dict] = []
            if query:
                local_query = db.query(MediaItem)
                if type_filter is not None:
                    local_query = local_query.filter(MediaItem.media_type == type_filter)
                if year is not None:
                    local_query = local_query.filter(
                        MediaItem.release_date >= datetime.date(year, 1, 1),
                        MediaItem.release_date < datetime.date(year + 1, 1, 1),
                    )
                items = local_query.filter(MediaItem.title.ilike(f"%{query}%")).limit(50).all()
                if author and (type_filter is None or type_filter == MediaType.BOOK):
                    items = [
                        i for i in items
                        if any(author.lower() in (a or "").lower() for a in (i.authors or []))
                    ]
                has_logs = _batch_has_logs(db, user_id, items)
                local_results = [_serialize_media(i, db, user_id, i.id in has_logs) for i in items]
            elif author and (type_filter is None or type_filter == MediaType.BOOK):
                books = (
                    db.query(MediaItem)
                    .filter(MediaItem.media_type == MediaType.BOOK)
                    .order_by(MediaItem.popularity.desc())
                    .all()
                )
                matched: List[MediaItem] = []
                for i in books:
                    if any(author.lower() in (a or "").lower() for a in (i.authors or [])):
                        matched.append(i)
                        if len(matched) >= 20:
                            break
                has_logs = _batch_has_logs(db, user_id, matched)
                local_results = [_serialize_media(i, db, user_id, i.id in has_logs) for i in matched]
            elif year:
                local_query = db.query(MediaItem).filter(
                    MediaItem.release_date >= datetime.date(year, 1, 1),
                    MediaItem.release_date < datetime.date(year + 1, 1, 1),
                )
                if type_filter is not None:
                    local_query = local_query.filter(MediaItem.media_type == type_filter)
                local_query = local_query.order_by(MediaItem.popularity.desc()).limit(20)
                items = local_query.all()
                has_logs = _batch_has_logs(db, user_id, items)
                local_results = [_serialize_media(i, db, user_id, i.id in has_logs) for i in items]

            if query:
                if type_filter in (None, MediaType.MOVIE):
                    try:
                        raw_movies = tmdb_service.search_media(query=query, media_type="movie", year=year) or []
                        external_results += [_tmdb_to_media(it, MediaType.MOVIE) for it in raw_movies[:5]]
                    except Exception:
                        pass

                if type_filter in (None, MediaType.SERIES):
                    try:
                        raw_tv = tmdb_service.search_media(query=query, media_type="tv", year=year) or []
                        external_results += [_tmdb_to_media(it, MediaType.SERIES) for it in raw_tv[:5]]
                    except Exception:
                        pass

                if type_filter in (None, MediaType.GAME):
                    try:
                        raw_games = igdb_service.search_games(query=query) or []
                        game_results = [_igdb_to_media(it) for it in raw_games[:10]]
                        if year is not None:
                            game_results = [
                                r for r in game_results
                                if r.get("release_date") and int(r["release_date"][:4]) == year
                            ]
                        external_results += game_results[:5]
                    except Exception:
                        pass

            if type_filter in (None, MediaType.BOOK) and (query or author or isbn):
                try:
                    raw_books = google_books_service.search_books(query=query, author=author, year=year, isbn=isbn) or []
                    external_results += [_book_to_media(it) for it in raw_books[:5]]
                    if not external_results and query:
                        raw_books2 = google_books_service.search_books(
                            query, author=author, year=year, isbn=isbn, use_intitle=False
                        ) or []
                        external_results += [_book_to_media(it) for it in raw_books2[:5]]
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

        if query:
            users = db.query(User).filter(
                (User.username.ilike(f"%{query}%")) | (User.display_name.ilike(f"%{query}%"))
            ).limit(20).all()
            user_results = [_serialize_user(u, db) for u in users]
            user_results.sort(key=lambda r: _fuzzy_score(query, r.get("display_name") or r.get("username") or ""), reverse=True)
            user_results = user_results[:8]

    return {"media": media_results, "users": user_results}


class TrackSearchRequest(BaseModel):
    query: str
    media_type: Optional[str] = None
    tmdb_id: Optional[int] = None
    igdb_id: Optional[int] = None
    google_books_id: Optional[str] = None
    steam_appid: Optional[int] = None
    cover_image_url: Optional[str] = None


def _serialize_search_term(term: SearchTerm) -> dict:
    return {
        "term": term.term,
        "media_type": term.media_type,
        "tmdb_id": term.tmdb_id,
        "igdb_id": term.igdb_id,
        "google_books_id": term.google_books_id,
        "steam_appid": term.steam_appid,
        "cover_image_url": term.cover_image_url,
    }


@router.get("/popular")
def popular_searches(*, db: Session = Depends(deps.get_db)) -> List[dict]:
    terms = (
        db.query(SearchTerm)
        .filter(
            func.length(SearchTerm.term) >= 3,
            SearchTerm.term.notlike("@%"),
            SearchTerm.media_type.isnot(None),
        )
        .order_by(SearchTerm.count.desc(), SearchTerm.last_searched_at.desc())
        .limit(10)
        .all()
    )
    return [_serialize_search_term(t) for t in terms]


@router.post("/track")
def track_search(*, db: Session = Depends(deps.get_db), payload: TrackSearchRequest) -> dict:
    q = payload.query.strip()
    if len(q) < 2 or q.startswith("@"):
        return {"ok": True}
    term = db.query(SearchTerm).filter(SearchTerm.term == q).first()
    if term:
        term.count += 1
        term.last_searched_at = datetime.datetime.utcnow()
        if payload.media_type:
            term.media_type = payload.media_type
        if payload.tmdb_id is not None:
            term.tmdb_id = payload.tmdb_id
        if payload.igdb_id is not None:
            term.igdb_id = payload.igdb_id
        if payload.google_books_id:
            term.google_books_id = payload.google_books_id
        if payload.steam_appid is not None:
            term.steam_appid = payload.steam_appid
        if payload.cover_image_url:
            term.cover_image_url = payload.cover_image_url
    else:
        db.add(SearchTerm(
            term=q,
            count=1,
            media_type=payload.media_type,
            tmdb_id=payload.tmdb_id,
            igdb_id=payload.igdb_id,
            google_books_id=payload.google_books_id,
            steam_appid=payload.steam_appid,
            cover_image_url=payload.cover_image_url,
        ))
    db.commit()
    return {"ok": True}
