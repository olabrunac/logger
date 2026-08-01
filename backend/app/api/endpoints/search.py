from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app import schemas
from app.api import deps
from app.models.media import MediaType, MediaItem
from app.models.user import User

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


def _serialize_media(item: MediaItem) -> dict:
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
    }


def _serialize_user(user: User, db: Session) -> dict:
    from app.crud import crud_follow
    data = schemas.User.model_validate(user).model_dump()
    data["followers_count"] = crud_follow.get_follower_count(db, user.id)
    data["following_count"] = crud_follow.get_following_count(db, user.id)
    return data


@router.get("")
def global_search(
    *,
    db: Session = Depends(deps.get_db),
    q: str = Query("", min_length=0, max_length=100),
) -> Any:
    query = q.strip()
    media_results: List[dict] = []
    user_results: List[dict] = []

    if query:
        items = db.query(MediaItem).filter(MediaItem.title.ilike(f"%{query}%")).limit(50).all()
        media_results = [_serialize_media(i) for i in items]
        media_results.sort(key=lambda r: _fuzzy_score(query, r.get("title", "")), reverse=True)
        media_results = media_results[:12]

        users = db.query(User).filter(
            (User.username.ilike(f"%{query}%")) | (User.display_name.ilike(f"%{query}%"))
        ).limit(20).all()
        user_results = [_serialize_user(u, db) for u in users]
        user_results.sort(key=lambda r: _fuzzy_score(query, r.get("display_name") or r.get("username") or ""), reverse=True)
        user_results = user_results[:8]

    return {"media": media_results, "users": user_results}
