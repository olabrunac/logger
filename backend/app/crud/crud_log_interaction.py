from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from app.models.media import LogReply, LogLike


def add_reply(db: Session, log_id: int, user_id: int, content: str) -> LogReply:
    reply = LogReply(log_id=log_id, user_id=user_id, content=content)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


def add_reply_to_episode_event(db: Session, episode_event_id: int, user_id: int, content: str) -> LogReply:
    reply = LogReply(episode_event_id=episode_event_id, user_id=user_id, content=content)
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


def get_replies(db: Session, log_id: int) -> List[LogReply]:
    return (
        db.query(LogReply)
        .filter(LogReply.log_id == log_id)
        .order_by(LogReply.created_at.asc())
        .all()
    )


def get_replies_for_episode_event(db: Session, episode_event_id: int) -> List[LogReply]:
    return (
        db.query(LogReply)
        .filter(LogReply.episode_event_id == episode_event_id)
        .order_by(LogReply.created_at.asc())
        .all()
    )


def get_replies_count(db: Session, log_id: int) -> int:
    return db.query(func.count(LogReply.id)).filter(LogReply.log_id == log_id).scalar()


def get_replies_count_for_episode_event(db: Session, episode_event_id: int) -> int:
    return db.query(func.count(LogReply.id)).filter(LogReply.episode_event_id == episode_event_id).scalar()


def like(db: Session, log_id: int, user_id: int) -> LogLike:
    existing = db.query(LogLike).filter(LogLike.log_id == log_id, LogLike.user_id == user_id).first()
    if existing:
        return existing
    like = LogLike(log_id=log_id, user_id=user_id)
    db.add(like)
    db.commit()
    db.refresh(like)
    return like


def like_episode_event(db: Session, episode_event_id: int, user_id: int) -> Optional[LogLike]:
    existing = db.query(LogLike).filter(
        LogLike.episode_event_id == episode_event_id, LogLike.user_id == user_id
    ).first()
    if existing:
        return existing
    lk = LogLike(episode_event_id=episode_event_id, user_id=user_id)
    db.add(lk)
    db.commit()
    db.refresh(lk)
    return lk


def unlike(db: Session, log_id: int, user_id: int) -> bool:
    like = db.query(LogLike).filter(LogLike.log_id == log_id, LogLike.user_id == user_id).first()
    if not like:
        return False
    db.delete(like)
    db.commit()
    return True


def unlike_episode_event(db: Session, episode_event_id: int, user_id: int) -> bool:
    lk = db.query(LogLike).filter(
        LogLike.episode_event_id == episode_event_id, LogLike.user_id == user_id
    ).first()
    if not lk:
        return False
    db.delete(lk)
    db.commit()
    return True


def get_likes_count(db: Session, log_id: int) -> int:
    return db.query(func.count(LogLike.id)).filter(LogLike.log_id == log_id).scalar()


def get_likes_count_for_episode_event(db: Session, episode_event_id: int) -> int:
    return db.query(func.count(LogLike.id)).filter(LogLike.episode_event_id == episode_event_id).scalar()


def has_liked(db: Session, log_id: int, user_id: int) -> bool:
    return db.query(LogLike).filter(LogLike.log_id == log_id, LogLike.user_id == user_id).first() is not None


def has_liked_episode_event(db: Session, episode_event_id: int, user_id: int) -> bool:
    return db.query(LogLike).filter(
        LogLike.episode_event_id == episode_event_id, LogLike.user_id == user_id
    ).first() is not None


def get_likers(db: Session, log_id: int, limit: int = 5) -> list:
    from app.models.user import User
    likes = (
        db.query(LogLike)
        .filter(LogLike.log_id == log_id)
        .order_by(LogLike.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for like in likes:
        u = db.query(User).filter(User.id == like.user_id).first()
        if u:
            result.append({"username": u.username, "avatar_url": u.avatar_url})
    return result


def get_likers_for_episode_event(db: Session, episode_event_id: int, limit: int = 5) -> list:
    from app.models.user import User
    likes = (
        db.query(LogLike)
        .filter(LogLike.episode_event_id == episode_event_id)
        .order_by(LogLike.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for lk in likes:
        u = db.query(User).filter(User.id == lk.user_id).first()
        if u:
            result.append({"username": u.username, "avatar_url": u.avatar_url})
    return result
