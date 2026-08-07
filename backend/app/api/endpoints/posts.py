import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import crud_post
from app.crud.crud_user import user as crud_user
from app.models.user import User

router = APIRouter()


@router.post("/posts")
def create_post(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    content: str,
):
    from app.schemas.post import PostCreate
    if len(content) > 280:
        raise HTTPException(status_code=400, detail="Post must be 280 characters or less")
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    post = crud_post.create_post(db, user_id=user_id, content=content)
    try:
        from app.crud.crud_user_badge import check_and_unlock
        check_and_unlock(db, user_id)
    except Exception:
        pass
    return _post_response(post, db, current_user_id=user_id)


@router.post("/posts/{post_id}/reply")
def reply_to_post(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
    user_id: int,
    content: str,
):
    if len(content) > 280:
        raise HTTPException(status_code=400, detail="Reply must be 280 characters or less")
    post = crud_post.get_post(db, post_id=post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    reply = crud_post.add_reply(db, post_id=post_id, user_id=user_id, content=content)
    if post.user_id != user_id:
        try:
            from app.crud.crud_notification import create_notification
            create_notification(db, user_id=post.user_id, type="reply", from_user_id=user_id, post_id=post_id)
        except Exception:
            pass
    return _reply_response(reply)


@router.get("/posts/feed")
def get_feed(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    limit: int = 50,
    offset: int = 0,
):
    posts = crud_post.get_feed(db, user_id=user_id, limit=limit, offset=offset)
    return _posts_response(posts, db, current_user_id=user_id)


@router.get("/posts/user/{target_user_id}")
def get_user_posts(
    *,
    db: Session = Depends(deps.get_db),
    target_user_id: int,
    current_user_id: int = None,
    limit: int = 50,
):
    posts = crud_post.get_user_posts(db, user_id=target_user_id, limit=limit)
    return _posts_response(posts, db, current_user_id=current_user_id)


@router.get("/posts/{post_id}/replies")
def get_post_replies(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
):
    post = crud_post.get_post(db, post_id=post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    replies = crud_post.get_replies(db, post_id=post_id)
    return [_reply_response(r) for r in replies]


@router.put("/posts/{post_id}")
def update_post(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
    user_id: int,
    content: str,
):
    if len(content) > 280:
        raise HTTPException(status_code=400, detail="Post must be 280 characters or less")
    post = crud_post.update_post(db, post_id=post_id, user_id=user_id, content=content)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not yours")
    return _post_response(post, db, current_user_id=user_id)


@router.delete("/posts/{post_id}")
def delete_post(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
    user_id: int,
):
    deleted = crud_post.delete_post(db, post_id=post_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Post not found or not yours")
    return {"message": "Post deleted"}


@router.post("/posts/upload-image")
async def upload_post_image(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
    file: UploadFile = File(...),
):
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}")

    is_gif = file.content_type == "image/gif"
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "png"
    filename = f"post_{uuid.uuid4().hex[:8]}.{ext}"

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB")

    from app.crud.crud_upload import save_file
    save_file(db, filename=filename, content_type=file.content_type, data=contents, is_gif=is_gif)

    crud_post.add_image(db, post_id=post_id, url=f"/uploads/{filename}", is_gif=is_gif)
    return {"url": f"/uploads/{filename}", "is_gif": is_gif}


@router.post("/posts/{post_id}/like")
def like_post(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
    user_id: int,
):
    post = crud_post.get_post(db, post_id=post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    crud_post.like_post(db, post_id=post_id, user_id=user_id)
    if post.user_id != user_id:
        try:
            from app.crud.crud_notification import create_notification
            create_notification(db, user_id=post.user_id, type="like", from_user_id=user_id, post_id=post_id)
        except Exception:
            pass
    return {"liked": True, "likes_count": crud_post.get_likes_count(db, post_id)}


@router.delete("/posts/{post_id}/like")
def unlike_post(
    *,
    db: Session = Depends(deps.get_db),
    post_id: int,
    user_id: int,
):
    post = crud_post.get_post(db, post_id=post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    crud_post.unlike_post(db, post_id=post_id, user_id=user_id)
    return {"liked": False, "likes_count": crud_post.get_likes_count(db, post_id)}


def _post_response(post, db, current_user_id: int = None):
    user = crud_user.get(db, id=post.user_id)
    images = [{"id": img.id, "url": img.url, "is_gif": img.is_gif, "position": img.position} for img in post.images]
    liked_by = crud_post.get_likers(db, post.id, limit=5)
    return {
        "id": post.id,
        "user_id": post.user_id,
        "username": user.username if user else "unknown",
        "avatar_url": user.avatar_url if user else None,
        "content": post.content,
        "images": images,
        "replies_count": crud_post.get_replies_count(db, post.id),
        "likes_count": crud_post.get_likes_count(db, post.id),
        "is_liked": crud_post.has_liked(db, post.id, current_user_id) if current_user_id else False,
        "liked_by": liked_by,
        "created_at": post.created_at.isoformat() if post.created_at else "",
    }


def _posts_response(posts, db, current_user_id: int = None):
    if not posts:
        return []
    author_ids = {p.user_id for p in posts}
    user_map = {}
    if author_ids:
        user_map = {u.id: u for u in db.query(User).filter(User.id.in_(author_ids)).all()}
    replies_count, likes_count, liked_by, is_liked_set = crud_post.get_posts_interactions(
        db, [p.id for p in posts], viewer_id=current_user_id
    )
    results = []
    for post in posts:
        user = user_map.get(post.user_id)
        results.append({
            "id": post.id,
            "user_id": post.user_id,
            "username": user.username if user else "unknown",
            "avatar_url": user.avatar_url if user else None,
            "content": post.content,
            "images": [{"id": img.id, "url": img.url, "is_gif": img.is_gif, "position": img.position} for img in post.images],
            "replies_count": replies_count.get(post.id, 0),
            "likes_count": likes_count.get(post.id, 0),
            "is_liked": post.id in is_liked_set,
            "liked_by": liked_by.get(post.id, []),
            "created_at": post.created_at.isoformat() if post.created_at else "",
        })
    return results


def _reply_response(reply):
    return {
        "id": reply.id,
        "post_id": reply.post_id,
        "user_id": reply.user_id,
        "username": reply.user.username if reply.user else "unknown",
        "avatar_url": reply.user.avatar_url if reply.user else None,
        "content": reply.content,
        "created_at": reply.created_at.isoformat() if reply.created_at else "",
    }
