from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.post import Post, PostImage, PostReply, PostLike


def create_post(db: Session, user_id: int, content: str, image_urls: List[str] = None) -> Post:
    post = Post(user_id=user_id, content=content)
    db.add(post)
    db.flush()
    if image_urls:
        for i, url in enumerate(image_urls):
            is_gif = url.lower().endswith('.gif')
            img = PostImage(post_id=post.id, url=url, is_gif=is_gif, position=i)
            db.add(img)
    db.commit()
    db.refresh(post)
    return post


def get_feed(db: Session, user_id: int, limit: int = 50, offset: int = 0) -> List[Post]:
    from app.models.user_follow import UserFollow
    following_ids = [f.following_id for f in db.query(UserFollow).filter(UserFollow.follower_id == user_id).all()]
    user_ids = list(set(following_ids + [user_id]))
    return (
        db.query(Post)
        .filter(Post.user_id.in_(user_ids))
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def get_user_posts(db: Session, user_id: int, limit: int = 50) -> List[Post]:
    return (
        db.query(Post)
        .filter(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
        .all()
    )


def get_post(db: Session, post_id: int) -> Optional[Post]:
    return db.query(Post).filter(Post.id == post_id).first()


def update_post(db: Session, post_id: int, user_id: int, content: str) -> Optional[Post]:
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()
    if not post:
        return None
    post.content = content
    db.commit()
    db.refresh(post)
    return post


def add_reply(db: Session, post_id: int, user_id: int, content: str) -> PostReply:
    reply = PostReply(post_id=post_id, user_id=user_id, content=content)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


def add_image(db: Session, post_id: int, url: str, is_gif: bool) -> PostImage:
    position = db.query(func.count(PostImage.id)).filter(PostImage.post_id == post_id).scalar()
    img = PostImage(post_id=post_id, url=url, is_gif=is_gif, position=position)
    db.add(img)
    db.commit()
    db.refresh(img)
    return img


def get_replies(db: Session, post_id: int) -> List[PostReply]:
    return (
        db.query(PostReply)
        .filter(PostReply.post_id == post_id)
        .order_by(PostReply.created_at.asc())
        .all()
    )


def get_replies_count(db: Session, post_id: int) -> int:
    return db.query(func.count(PostReply.id)).filter(PostReply.post_id == post_id).scalar()


def delete_post(db: Session, post_id: int, user_id: int) -> bool:
    post = db.query(Post).filter(Post.id == post_id, Post.user_id == user_id).first()
    if not post:
        return False
    db.delete(post)
    db.commit()
    return True


def like_post(db: Session, post_id: int, user_id: int) -> PostLike:
    existing = db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.user_id == user_id).first()
    if existing:
        return existing
    like = PostLike(post_id=post_id, user_id=user_id)
    db.add(like)
    db.commit()
    db.refresh(like)
    return like


def unlike_post(db: Session, post_id: int, user_id: int) -> bool:
    like = db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.user_id == user_id).first()
    if not like:
        return False
    db.delete(like)
    db.commit()
    return True


def get_likes_count(db: Session, post_id: int) -> int:
    return db.query(func.count(PostLike.id)).filter(PostLike.post_id == post_id).scalar()


def has_liked(db: Session, post_id: int, user_id: int) -> bool:
    return db.query(PostLike).filter(PostLike.post_id == post_id, PostLike.user_id == user_id).first() is not None


def get_likers(db: Session, post_id: int, limit: int = 5) -> list:
    from app.models.user import User
    likes = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id)
        .order_by(PostLike.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for like in likes:
        u = db.query(User).filter(User.id == like.user_id).first()
        if u:
            result.append({"username": u.username, "avatar_url": u.avatar_url})
    return result
