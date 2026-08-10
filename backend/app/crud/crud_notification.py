from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from app.models.notification import Notification
from app.models.user import User
from app.models.post import Post, PostReply
from app.core.badge_definitions import BADGE_DEFS


def create_notification(db: Session, *, user_id: int, type: str, from_user_id: int = None, post_id: int = None, badge_key: str = None) -> Notification:
    if from_user_id and from_user_id == user_id:
        return None
    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == type,
            Notification.from_user_id == from_user_id,
            Notification.post_id == post_id,
            Notification.badge_key == badge_key,
            Notification.read == False,
        )
        .first()
    )
    if existing:
        return None
    n = Notification(user_id=user_id, type=type, from_user_id=from_user_id, post_id=post_id, badge_key=badge_key)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def get_notifications(db: Session, user_id: int, limit: int = 50, offset: int = 0):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(asc(Notification.read), desc(Notification.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for n in rows:
        from_user = db.query(User).filter(User.id == n.from_user_id).first() if n.from_user_id else None
        badge_def = BADGE_DEFS.get(n.badge_key) if n.badge_key else None
        post_content = None
        reply_content = None
        if n.post_id:
            post = db.query(Post).filter(Post.id == n.post_id).first()
            if post:
                post_content = post.content[:150] if len(post.content) > 150 else post.content
        if n.type == "reply" and n.post_id:
            reply = (
                db.query(PostReply)
                .filter(PostReply.post_id == n.post_id, PostReply.user_id == n.from_user_id)
                .order_by(PostReply.created_at.desc())
                .first()
            )
            if reply:
                reply_content = reply.content[:150] if len(reply.content) > 150 else reply.content
        result.append({
            "id": n.id,
            "user_id": n.user_id,
            "type": n.type,
            "from_user_id": n.from_user_id,
            "from_username": from_user.username if from_user else None,
            "from_avatar_url": from_user.avatar_url if from_user else None,
            "post_id": n.post_id,
            "post_content": post_content,
            "reply_content": reply_content,
            "badge_description": badge_def.description if badge_def else None,
            "badge_title": badge_def.title if badge_def else None,
            "badge_icon": badge_def.icon if badge_def else None,
            "badge_rarity": badge_def.rarity if badge_def else None,
            "read": n.read,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        })
    return result


def get_unread_count(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.read == False).count()


def mark_read(db: Session, notification_id: int, user_id: int) -> bool:
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not n:
        return False
    n.read = True
    db.commit()
    return True


def mark_all_read(db: Session, user_id: int):
    db.query(Notification).filter(Notification.user_id == user_id, Notification.read == False).update({"read": True})
    db.commit()
