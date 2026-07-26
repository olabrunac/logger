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

@router.put("/{user_id}/profile", response_model=schemas.User)
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
    return user


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


@router.put("/{user_id}/change-email", response_model=schemas.User)
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
    return user


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
