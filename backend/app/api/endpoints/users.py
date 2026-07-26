import os
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app import crud, schemas
from app.api import deps

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
    user = crud.user.update(db, db_obj=user, obj_in=user_in)
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
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/uploads/{filename}"

    if upload_type == "banner":
        old_url = user.banner_url
        crud.user.update(db, db_obj=user, obj_in={"banner_url": url})
    else:
        old_url = user.avatar_url
        crud.user.update(db, db_obj=user, obj_in={"avatar_url": url})

    if old_url:
        old_path = old_url.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    return {"url": url}


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

@router.get("/{user_id}/timeline")
def get_timeline(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    limit: int = 50,
):
    from app.crud import crud_follow
    from app.models.media import LogEntry

    following_ids_raw = crud_follow.get_following(db, user_id=user_id)
    following_ids = [u.id for u in following_ids_raw]
    user_ids = list(set(following_ids + [user_id]))

    logs = (
        db.query(LogEntry)
        .filter(LogEntry.user_id.in_(user_ids))
        .order_by(LogEntry.log_date.desc())
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        user_obj = crud.user.get(db, id=log.user_id)
        result.append({
            "id": log.id,
            "user": {
                "id": user_obj.id,
                "username": user_obj.username,
                "avatar_url": user_obj.avatar_url,
            } if user_obj else None,
            "media_item": {
                "id": log.media_item.id,
                "title": log.media_item.title,
                "media_type": log.media_item.media_type,
                "cover_image_url": log.media_item.cover_image_url,
            } if log.media_item else None,
            "status": log.status.value if log.status else None,
            "rating": log.rating,
            "review": log.review,
            "platform": log.platform,
            "log_date": log.log_date.isoformat() if log.log_date else None,
            "is_favorite": log.is_favorite,
            "hours_spent": log.hours_spent,
        })

    return result
