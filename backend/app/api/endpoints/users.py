import os
import uuid
import json
import datetime
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
    if url:
        path = url.lstrip("/")
        if os.path.exists(path):
            os.remove(path)

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

    for log in user.logs:
        db.delete(log)
    db.flush()

    for url in (user.banner_url, user.avatar_url):
        if url:
            path = url.lstrip("/")
            if os.path.exists(path):
                os.remove(path)

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
    return [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in followers]


@router.get("/{user_id}/following")
def get_following(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    from app.crud import crud_follow
    following = crud_follow.get_following(db, user_id=user_id)
    return [{"id": u.id, "username": u.username, "avatar_url": u.avatar_url} for u in following]


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

    from app.models.media import LogEntry, EpisodeWatched, Achievement, LogReview, TopListItem, CustomList, CustomListItem
    from app.models.post import Post, PostImage, PostReply, PostLike
    from app.models.notification import Notification
    from app.models.user_badge import UserBadge
    from app.models.user_follow import UserFollow

    log_ids = [l.id for l in db.query(LogEntry).filter(LogEntry.user_id == user_id).all()]
    if log_ids:
        db.query(EpisodeWatched).filter(EpisodeWatched.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(Achievement).filter(Achievement.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogReview).filter(LogReview.log_id.in_(log_ids)).delete(synchronize_session=False)
        db.query(LogEntry).filter(LogEntry.id.in_(log_ids)).delete(synchronize_session=False)

    db.query(TopListItem).filter(TopListItem.user_id == user_id).delete(synchronize_session=False)

    custom_ids = [c.id for c in db.query(CustomList).filter(CustomList.user_id == user_id).all()]
    if custom_ids:
        db.query(CustomListItem).filter(CustomListItem.custom_list_id.in_(custom_ids)).delete(synchronize_session=False)
        db.query(CustomList).filter(CustomList.id.in_(custom_ids)).delete(synchronize_session=False)

    post_ids = [p.id for p in db.query(Post).filter(Post.user_id == user_id).all()]
    if post_ids:
        db.query(Notification).filter(Notification.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(PostLike).filter(PostLike.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(PostReply).filter(PostReply.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(PostImage).filter(PostImage.post_id.in_(post_ids)).delete(synchronize_session=False)
        db.query(Post).filter(Post.id.in_(post_ids)).delete(synchronize_session=False)

    reply_ids = [r.id for r in db.query(PostReply).filter(PostReply.user_id == user_id).all()]
    if reply_ids:
        db.query(PostReply).filter(PostReply.id.in_(reply_ids)).delete(synchronize_session=False)

    like_ids = [l.id for l in db.query(PostLike).filter(PostLike.user_id == user_id).all()]
    if like_ids:
        db.query(PostLike).filter(PostLike.id.in_(like_ids)).delete(synchronize_session=False)

    notif_ids = [n.id for n in db.query(Notification).filter(
        (Notification.user_id == user_id) | (Notification.from_user_id == user_id)
    ).all()]
    if notif_ids:
        db.query(Notification).filter(Notification.id.in_(notif_ids)).delete(synchronize_session=False)

    follow_ids = [f.id for f in db.query(UserFollow).filter(
        (UserFollow.follower_id == user_id) | (UserFollow.following_id == user_id)
    ).all()]
    if follow_ids:
        db.query(UserFollow).filter(UserFollow.id.in_(follow_ids)).delete(synchronize_session=False)

    from app.core.badge_definitions import BADGE_DEFS
    special_keys = {k for k, d in BADGE_DEFS.items() if d.special}
    badge_ids = [b.id for b in db.query(UserBadge).filter(
        UserBadge.user_id == user_id, ~UserBadge.badge_key.in_(special_keys)
    ).all()]
    if badge_ids:
        db.query(UserBadge).filter(UserBadge.id.in_(badge_ids)).delete(synchronize_session=False)

    db.commit()
    return {"message": "Dados limpos com sucesso. Avatar, banner, cor e badges especiais mantidos."}

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
):
    from app.crud import crud_follow, crud_log_interaction
    from app.models.media import LogEntry

    following_ids_raw = crud_follow.get_following(db, user_id=user_id)
    following_ids = [u.id for u in following_ids_raw]
    user_ids = list(set(following_ids + [user_id]))

    logs = (
        db.query(LogEntry)
        .filter(LogEntry.user_id.in_(user_ids))
        .order_by(LogEntry.log_date.desc())
        .limit(limit * 2)
        .all()
    )

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

    # Group by (user_id, media_type, log_date without time)
    groups: dict = {}
    for log in logs:
        if not log.log_date:
            continue
        date_key = log.log_date.date().isoformat()
        mt = log.media_item.media_type if log.media_item else "unknown"
        key = (log.user_id, mt, date_key)

        if key not in groups:
            user_obj = crud.user.get(db, id=log.user_id)
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
            "hours_spent": effective_hours(db, log),
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
                "hours_spent": item["hours_spent"],
                "replies_count": crud_log_interaction.get_replies_count(db, item["log_id"]),
                "likes_count": crud_log_interaction.get_likes_count(db, item["log_id"]),
                "is_liked": crud_log_interaction.has_liked(db, item["log_id"], user_id),
                "liked_by": crud_log_interaction.get_likers(db, item["log_id"], limit=5),
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
    return result[:limit]
