from typing import List
from sqlalchemy.orm import Session
from app.models.user_follow import UserFollow
from app.models.user import User


def get_followers(db: Session, user_id: int) -> List[User]:
    follows = db.query(UserFollow).filter(UserFollow.following_id == user_id).all()
    follower_ids = [f.follower_id for f in follows]
    if not follower_ids:
        return []
    return db.query(User).filter(User.id.in_(follower_ids)).all()


def get_following(db: Session, user_id: int) -> List[User]:
    follows = db.query(UserFollow).filter(UserFollow.follower_id == user_id).all()
    following_ids = [f.following_id for f in follows]
    if not following_ids:
        return []
    return db.query(User).filter(User.id.in_(following_ids)).all()


def get_follower_count(db: Session, user_id: int) -> int:
    from sqlalchemy import func
    return db.query(func.count(UserFollow.id)).filter(UserFollow.following_id == user_id).scalar()


def get_following_count(db: Session, user_id: int) -> int:
    from sqlalchemy import func
    return db.query(func.count(UserFollow.id)).filter(UserFollow.follower_id == user_id).scalar()


def is_following(db: Session, follower_id: int, following_id: int) -> bool:
    return db.query(UserFollow).filter(
        UserFollow.follower_id == follower_id,
        UserFollow.following_id == following_id,
    ).first() is not None


def follow_user(db: Session, follower_id: int, following_id: int) -> UserFollow:
    existing = db.query(UserFollow).filter(
        UserFollow.follower_id == follower_id,
        UserFollow.following_id == following_id,
    ).first()
    if existing:
        return existing
    follow = UserFollow(follower_id=follower_id, following_id=following_id)
    db.add(follow)
    db.commit()
    return follow


def unfollow_user(db: Session, follower_id: int, following_id: int) -> bool:
    follow = db.query(UserFollow).filter(
        UserFollow.follower_id == follower_id,
        UserFollow.following_id == following_id,
    ).first()
    if follow:
        db.delete(follow)
        db.commit()
        return True
    return False
