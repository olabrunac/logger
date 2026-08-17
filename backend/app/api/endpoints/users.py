import os
import uuid
import json
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from app import crud, schemas
from app.api import deps
from app.services.hours_service import effective_hours

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_BANNER_SIZE = 5 * 1024 * 1024  # 5MB
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB

@router.put("/{user_id}/profile")
def update_user_profile(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: schemas.UserUpdate,
):
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = user_in.model_dump(exclude_unset=True)
    birth_date_in = update_data.pop("birth_date", None)
    if birth_date_in is not None:
        if user.birth_date_updated_at is not None:
            raise HTTPException(status_code=400, detail="Sua data de nascimento já foi alterada. Só é permitido alterar uma única vez.")
        user.birth_date = birth_date_in
        user.birth_date_updated_at = datetime.datetime.utcnow()
    if update_data:
        user = crud.user.update(db, db_obj=user, obj_in=update_data)
    else:
        db.add(user)
        db.commit()
        db.refresh(user)
    from app.crud import crud_follow
    data = schemas.User.model_validate(user).model_dump()
    data["followers_count"] = crud_follow.get_follower_count(db, user.id)
    data["following_count"] = crud_follow.get_following_count(db, user.id)
    return data


@router.post("/{user_id}/upload/{upload_type}", response_model=dict)
async def upload_image(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    upload_type: str,
    file: UploadFile = File(...),
):
    if upload_type not in ("banner", "avatar"):
        raise HTTPException(status_code=400, detail="Invalid upload type. Use 'banner' or 'avatar'.")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPEG, PNG, WebP, GIF. Got: {file.content_type}",
        )

    max_size = MAX_BANNER_SIZE if upload_type == "banner" else MAX_AVATAR_SIZE
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB",
        )

    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png"
    filename = f"{upload_type}_{user_id}_{uuid.uuid4().hex[:8]}.{ext}"

    from app.crud.crud_upload import save_file, delete_file
    save_file(db, filename=filename, content_type=file.content_type, data=contents, is_gif=file.content_type == "image/gif")

    url = f"/uploads/{filename}"

    if upload_type == "banner":
        old_url = user.banner_url
        crud.user.update(db, db_obj=user, obj_in={"banner_url": url})
    else:
        old_url = user.avatar_url
        crud.user.update(db, db_obj=user, obj_in={"avatar_url": url})

    if old_url:
        old_path = old_url.lstrip("/")
        if old_path.startswith("uploads/"):
            delete_file(db, old_path[len("uploads/"):])

    return {"url": url}


@router.delete("/{user_id}/upload/{upload_type}", response_model=dict)
def delete_image(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    upload_type: str,
):
    if upload_type not in ("banner", "avatar"):
        raise HTTPException(status_code=400, detail="Invalid upload type. Use 'banner' or 'avatar'.")

    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    url = user.banner_url if upload_type == "banner" else user.avatar_url
    if url and url.startswith("/uploads/"):
        filename = os.path.basename(url[len("/uploads/"):].replace("\\", "/"))
        from app.crud.crud_upload import delete_file
        delete_file(db, filename)
        disk_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.isfile(disk_path):
            os.remove(disk_path)

    crud.user.update(db, db_obj=user, obj_in={f"{upload_type}_url": None})
    return {"detail": "deleted"}


@router.delete("/{user_id}")
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.models.post import Post, PostImage, PostReply, PostLike
    from app.models.media import LogEntry, LogReply, LogLike, EpisodeWatched, Achievement, LogReview
    from app.models.notification import Notification
    from app.models.user_badge import UserBadge
    from app.models.user_follow import UserFollow

    post_ids = [p.id for p in db.query(Post).filter(Post.user_id == user_id).all()]
    if post_ids:
        db.query(PostImage).filter(PostImage.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(PostReply).filter(PostReply.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(PostLike).filter(PostLike.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(Post).filter(Post.id.in_(post_ids)).delete(synchronize_session=False)
    db.query(PostReply).filter(PostReply.user_id == user_id).delete(synchronize_session=False)
    db.query(PostLike).filter(PostLike.user_id == user_id).delete(synchronize_session=False)

    log_ids = [l.id for l in db.query(LogEntry).filter(LogEntry.user_id == user_id).all()]
    if log_ids:
        db.query(LogReply).filter(LogReply.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogLike).filter(LogLike.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(EpisodeWatched).filter(EpisodeWatched.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(Achievement).filter(Achievement.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogReview).filter(LogReview.log_id.in_(log_ids)).delete(synchronize_session=False)

    db.query(Notification).filter(
        (Notification.user_id == user_id) | (Notification.from_user_id == user_id)
    ).delete(synchronize_session=False)
    db.query(UserBadge).filter(UserBadge.user_id == user_id).delete(synchronize_session=False)
    db.query(UserFollow).filter(
        (UserFollow.follower_id == user_id) | (UserFollow.following_id == user_id)
    ).delete(synchronize_session=False)

    for log in user.logs:
        db.delete(log)
    db.flush()

    for url in (user.banner_url, user.avatar_url):
        if url and url.startswith("/uploads/"):
            filename = os.path.basename(url[len("/uploads/"):].replace("\\", "/"))
            from app.crud.crud_upload import delete_file
            delete_file(db, filename)
            disk_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(disk_path):
                os.remove(disk_path)

    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


@router.put("/{user_id}/change-email")
def change_email(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    data: schemas.ChangeEmailRequest,
):
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="Account has no password set")
    if not crud.user.verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")
    existing = crud.user.get_by_email(db, email=data.new_email)
    if existing and existing.id != user_id:
        raise HTTPException(status_code=400, detail="Email already in use")
    user.email = data.new_email
    db.add(user)
    db.commit()
    db.refresh(user)
    from app.crud import crud_follow
    resp = schemas.User.model_validate(user).model_dump()
    resp["followers_count"] = crud_follow.get_follower_count(db, user.id)
    resp["following_count"] = crud_follow.get_following_count(db, user.id)
    return resp


@router.put("/{user_id}/change-password")
def change_password(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    data: schemas.ChangePasswordRequest,
):
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="Account has no password set")
    if not crud.user.verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")
    user.password_hash = crud.user.hash_password(data.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password changed successfully"}


# --- Follow system ---

@router.post("/{user_id}/follow/{target_id}")
def follow_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    target_id: int,
):
    if user_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    target = crud.user.get(db, id=target_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")
    from app.crud import crud_follow
    crud_follow.follow_user(db, follower_id=user_id, following_id=target_id)
    try:
        from app.crud.crud_notification import create_notification
        create_notification(db, user_id=target_id, type="follow", from_user_id=user_id)
    except Exception:
        pass
    try:
        from app.crud.crud_user_badge import check_and_unlock
        check_and_unlock(db, target_id)
    except Exception:
        pass
    return {"message": "Followed"}


@router.delete("/{user_id}/follow/{target_id}")
def unfollow_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    target_id: int,
):
    from app.crud import crud_follow
    removed = crud_follow.unfollow_user(db, follower_id=user_id, following_id=target_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Not following")
    return {"message": "Unfollowed"}


@router.get("/{user_id}/is-following/{target_id}")
def check_following(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    target_id: int,
):
    from app.crud import crud_follow
    return {"is_following": crud_follow.is_following(db, follower_id=user_id, following_id=target_id)}


@router.get("/{user_id}/followers")
def get_followers(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    from app.crud import crud_follow
    followers = crud_follow.get_followers(db, user_id=user_id)
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "accent_color": u.accent_color,
        }
        for u in followers
    ]


@router.get("/{user_id}/following")
def get_following(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    from app.crud import crud_follow
    following = crud_follow.get_following(db, user_id=user_id)
    return [
        {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "accent_color": u.accent_color,
        }
        for u in following
    ]


# --- Timeline ---

@router.post("/{user_id}/wipe")
def wipe_user_data(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    user = crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.models.media import LogEntry, LogReply, LogLike, EpisodeWatched, Achievement, LogReview, TopListItem, CustomList, CustomListItem
    from app.models.post import PostLike
    from app.models.notification import Notification
    from app.models.user_badge import UserBadge

    log_ids = [l.id for l in db.query(LogEntry).filter(LogEntry.user_id == user_id).all()]
    if log_ids:
        db.query(LogReply).filter(LogReply.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogLike).filter(LogLike.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(EpisodeWatched).filter(EpisodeWatched.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(Achievement).filter(Achievement.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogReview).filter(LogReview.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogEntry).filter(LogEntry.id.in_(log_ids)).delete(synchronize_session=False)

    db.query(TopListItem).filter(TopListItem.user_id == user_id).delete(synchronize_session=False)

    custom_ids = [c.id for c in db.query(CustomList).filter(CustomList.user_id == user_id).all()]
    if custom_ids:
        db.query(CustomListItem).filter(CustomListItem.custom_list_id.in_(custom_ids)).delete(synchronize_session=False)
        db.query(CustomList).filter(CustomList.id.in_(custom_ids)).delete(synchronize_session=False)

    # Posts, replies e follows são PRESERVADOS no wipe: o usuário mantém sua
    # timeline (posts), suas respostas, quem segue e seus seguidores.

    like_ids = [l.id for l in db.query(PostLike).filter(PostLike.user_id == user_id).all()]
    if like_ids:
        db.query(PostLike).filter(PostLike.id.in_(like_ids)).delete(synchronize_session=False)

    notif_ids = [n.id for n in db.query(Notification).filter(
        (Notification.user_id == user_id) | (Notification.from_user_id == user_id)
    ).all()]
    if notif_ids:
        db.query(Notification).filter(Notification.id.in_(notif_ids)).delete(synchronize_session=False)

    from app.core.badge_definitions import BADGE_DEFS
    special_keys = {k for k, d in BADGE_DEFS.items() if d.special}
    badge_ids = [b.id for b in db.query(UserBadge).filter(
        UserBadge.user_id == user_id, ~UserBadge.badge_key.in_(special_keys)
    ).all()]
    if badge_ids:
        db.query(UserBadge).filter(UserBadge.id.in_(badge_ids)).delete(synchronize_session=False)

    db.commit()
    return {"message": "Dados limpos com sucesso. Posts, respostas, seguidores, seguindo, avatar, banner, cor e badges especiais mantidos."}

@router.get("/{user_id}/achievements")
def get_user_achievements(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    from app.models.media import Achievement, LogEntry, MediaItem

    logs = (
        db.query(LogEntry)
        .filter(LogEntry.user_id == user_id)
        .options(joinedload(LogEntry.achievements), joinedload(LogEntry.media_item))
        .all()
    )
    result = []
    for log in logs:
        if not log.achievements:
            continue
        for ach in log.achievements:
            if ach.unlocked:
                result.append({
                    "id": ach.id,
                    "log_id": log.id,
                    "external_id": ach.external_id,
                    "name": ach.name,
                    "description": ach.description,
                    "image_url": ach.image_url,
                    "game_title": log.media_item.title if log.media_item else "Unknown",
                    "game_cover": log.media_item.cover_image_url if log.media_item else None,
                })
    return result

@router.get("/{user_id}/timeline")
def get_timeline(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    limit: int = 50,
    before: Optional[str] = None,
):
    from app.crud import crud_follow
    from app.models.media import LogEntry, LogReply, LogLike, EpisodeWatched, EpisodeTimelineEvent, MediaItem, MediaType
    from app.models.user import User
    from sqlalchemy import func as sa_func, or_, and_
    from sqlalchemy.orm import joinedload

    following_ids_raw = crud_follow.get_following(db, user_id=user_id)
    following_ids = [u.id for u in following_ids_raw]
    user_ids = list(set(following_ids + [user_id]))

    # Paginate GROUPS (user + media_type + day) in SQL so one user with many
    # logs on a single day cannot push everyone else out of the page.
    def _group_base():
        return (
            db.query(
                LogEntry.user_id,
                MediaItem.media_type,
                sa_func.date(LogEntry.log_date).label("gdate"),
            )
            .outerjoin(MediaItem, LogEntry.media_item_id == MediaItem.id)
            .filter(LogEntry.user_id.in_(user_ids), LogEntry.log_date.isnot(None))
        )

    group_q = _group_base()
    if before:
        try:
            before_dt = datetime.datetime.strptime(before, "%Y-%m-%d")
            group_q = group_q.filter(LogEntry.log_date < before_dt)
        except ValueError:
            pass
    group_keys = (
        group_q
        .group_by(LogEntry.user_id, MediaItem.media_type, sa_func.date(LogEntry.log_date))
        .order_by(sa_func.date(LogEntry.log_date).desc())
        .limit(limit)
        .all()
    )
    # Se o corte caiu no meio de um dia, incluir todos os grupos do mesmo dia
    if group_keys:
        last_date = group_keys[-1].gdate
        extra = (
            _group_base()
            .filter(sa_func.date(LogEntry.log_date) == last_date)
            .group_by(LogEntry.user_id, MediaItem.media_type, sa_func.date(LogEntry.log_date))
            .order_by(sa_func.date(LogEntry.log_date).desc())
            .all()
        )
        existing = {(g[0], g[1], g[2]) for g in group_keys}
        for gk in extra:
            if gk not in existing:
                group_keys.append(gk)

    conds = []
    for (uid, mt, d) in group_keys:
        c = and_(LogEntry.user_id == uid, sa_func.date(LogEntry.log_date) == d)
        if mt is None:
            c = and_(c, LogEntry.media_item_id.is_(None))
        else:
            c = and_(c, MediaItem.media_type == mt)
        conds.append(c)
    if conds:
        logs = (
            db.query(LogEntry)
            .options(joinedload(LogEntry.media_item))
            .outerjoin(MediaItem, LogEntry.media_item_id == MediaItem.id)
            .filter(or_(*conds))
            .all()
        )
    else:
        logs = []

    def _media_ref(mi):
        if not mi:
            return None
        return {
            "id": mi.id,
            "title": mi.title,
            "media_type": mi.media_type.value,
            "cover_image_url": mi.cover_image_url,
            "tmdb_id": mi.tmdb_id,
            "igdb_id": mi.igdb_id,
            "steam_appid": mi.steam_appid,
            "google_books_id": mi.google_books_id,
        }

    # Batch data: users, watched counts and log interactions (avoid N+1)
    needed_user_ids = {log.user_id for log in logs}
    user_map = {}
    if needed_user_ids:
        user_map = {u.id: u for u in db.query(User).filter(User.id.in_(needed_user_ids)).all()}

    series_log_ids = [
        log.id for log in logs
        if log.media_item and log.media_item.media_type == MediaType.SERIES
    ]
    watched_counts: dict[int, int] = {}
    if series_log_ids:
        watched_counts = {
            log_id: count
            for log_id, count in db.query(EpisodeWatched.log_id, sa_func.count())
            .filter(
                EpisodeWatched.log_id.in_(series_log_ids),
                EpisodeWatched.watched == True,
                EpisodeWatched.season_number > 0,
            )
            .group_by(EpisodeWatched.log_id)
            .all()
        }

    log_ids = [log.id for log in logs]
    replies_count: dict[int, int] = {}
    likes_count: dict[int, int] = {}
    liked_by: dict[int, list] = {}
    is_liked_set: set = set()
    if log_ids:
        replies_count = {
            log_id: count
            for log_id, count in db.query(LogReply.log_id, sa_func.count())
            .filter(LogReply.log_id.in_(log_ids))
            .group_by(LogReply.log_id)
            .all()
        }
        likes_count = {
            log_id: count
            for log_id, count in db.query(LogLike.log_id, sa_func.count())
            .filter(LogLike.log_id.in_(log_ids))
            .group_by(LogLike.log_id)
            .all()
        }
        like_rows = (
            db.query(LogLike)
            .filter(LogLike.log_id.in_(log_ids))
            .order_by(LogLike.created_at.desc())
            .all()
        )
        likers: dict[int, list[int]] = {}
        for lk in like_rows:
            lst = likers.setdefault(lk.log_id, [])
            if len(lst) < 5:
                lst.append(lk.user_id)
        liker_user_ids = {uid for lst in likers.values() for uid in lst}
        liker_map = {}
        if liker_user_ids:
            liker_map = {u.id: u for u in db.query(User).filter(User.id.in_(liker_user_ids)).all()}
        liked_by = {
            lid: [{"username": liker_map[uid].username, "avatar_url": liker_map[uid].avatar_url} for uid in lst if uid in liker_map]
            for lid, lst in likers.items()
        }
        is_liked_set = {
            lid
            for (lid,) in db.query(LogLike.log_id)
            .filter(LogLike.log_id.in_(log_ids), LogLike.user_id == user_id)
            .all()
        }

    # Group by (user_id, media_type, log_date without time)
    groups: dict = {}
    for log in logs:
        if not log.log_date:
            continue
        date_key = log.log_date.date().isoformat()
        mt = log.media_item.media_type if log.media_item else "unknown"
        key = (log.user_id, mt, date_key)

        if key not in groups:
            user_obj = user_map.get(log.user_id)
            groups[key] = {
                "user": {
                    "id": user_obj.id,
                    "username": user_obj.username,
                    "avatar_url": user_obj.avatar_url,
                } if user_obj else None,
                "media_type": mt,
                "log_date": date_key,
                "items": [],
            }

        groups[key]["items"].append({
            "log_id": log.id,
            "media_item": _media_ref(log.media_item),
            "status": log.status.value if log.status else None,
            "rating": log.rating,
            "review": log.review,
            "platform": log.platform,
            "is_favorite": log.is_favorite,
            "family_share": log.family_share,
            "hours_spent": effective_hours(db, log, watched_counts.get(log.id, 0)),
        })

    result = []
    for g in groups.values():
        items = sorted(g["items"], key=lambda x: x["log_id"], reverse=True)
        if len(items) == 1:
            item = items[0]
            mi = item["media_item"]
            result.append({
                "id": item["log_id"],
                "user": g["user"],
                "media_item": mi,
                "status": item["status"],
                "rating": item["rating"],
                "review": item["review"],
                "platform": item["platform"],
                "log_date": g["log_date"],
                "is_favorite": item["is_favorite"],
                "family_share": item["family_share"],
                "hours_spent": item["hours_spent"],
                "replies_count": replies_count.get(item["log_id"], 0),
                "likes_count": likes_count.get(item["log_id"], 0),
                "is_liked": item["log_id"] in is_liked_set,
                "liked_by": liked_by.get(item["log_id"], []),
            })
        else:
            # Determine the most common status in the group
            from collections import Counter
            status_counts = Counter(x["status"] for x in items if x["status"])
            group_status = status_counts.most_common(1)[0][0] if status_counts else None

            result.append({
                "id": items[0]["log_id"],
                "user": g["user"],
                "media_item": items[0]["media_item"],
                "status": group_status,
                "rating": None,
                "platform": None,
                "review": None,
                "log_date": g["log_date"],
                "is_favorite": False,
                "hours_spent": None,
                "group_count": len(items),
                "group_items": [{
                    "id": x["media_item"]["id"] if x["media_item"] else x["log_id"],
                    "title": x["media_item"]["title"] if x["media_item"] else "Unknown",
                    "media_type": x["media_item"]["media_type"] if x["media_item"] else g["media_type"],
                    "cover_image_url": x["media_item"]["cover_image_url"] if x["media_item"] else None,
                    "tmdb_id": x["media_item"]["tmdb_id"] if x["media_item"] else None,
                    "igdb_id": x["media_item"]["igdb_id"] if x["media_item"] else None,
                    "steam_appid": x["media_item"]["steam_appid"] if x["media_item"] else None,
                    "google_books_id": x["media_item"]["google_books_id"] if x["media_item"] else None,
                    "status": x["status"],
                } for x in items],
            })

    result.sort(key=lambda x: x["log_date"], reverse=True)

    # --- Episode timeline events (watched / reviewed) ---
    ep_events = (
        db.query(EpisodeTimelineEvent)
        .options(
            joinedload(EpisodeTimelineEvent.media_item),
            joinedload(EpisodeTimelineEvent.user),
        )
        .filter(EpisodeTimelineEvent.user_id.in_(user_ids))
        .order_by(EpisodeTimelineEvent.created_at.desc())
        .limit(limit * 2)
        .all()
    )
    for evt in ep_events:
        mi = evt.media_item
        user_obj = evt.user
        date_key = evt.created_at.date().isoformat()
        result.append({
            "id": f"ep_evt_{evt.id}",
            "_type": "episode_event",
            "event_type": evt.event_type,
            "season_number": evt.season_number,
            "episode_start": evt.episode_start,
            "episode_end": evt.episode_end,
            "review_text": evt.review_text,
            "rating": evt.rating,
            "created_at": evt.created_at.isoformat(),
            "user": {
                "id": user_obj.id,
                "username": user_obj.username,
                "avatar_url": user_obj.avatar_url,
            } if user_obj else None,
            "media_item": {
                "id": mi.id,
                "title": mi.title,
                "media_type": mi.media_type.value if mi.media_type else None,
                "cover_image_url": mi.cover_image_url,
                "tmdb_id": mi.tmdb_id,
                "igdb_id": mi.igdb_id,
                "steam_appid": mi.steam_appid,
                "google_books_id": mi.google_books_id,
            } if mi else None,
            "log_date": date_key,
            "replies_count": 0,
            "likes_count": 0,
            "is_liked": False,
            "liked_by": [],
        })

    result.sort(key=lambda x: x.get("created_at") or x.get("log_date"), reverse=True)
    return result
