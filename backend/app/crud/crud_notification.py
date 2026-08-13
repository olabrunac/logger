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
    from_ids = {n.from_user_id for n in rows if n.from_user_id}
    post_ids = {n.post_id for n in rows if n.post_id}
    users = {
        u.id: u for u in db.query(User).filter(User.id.in_(from_ids)).all()
    } if from_ids else {}
    posts = {
        p.id: p for p in db.query(Post).filter(Post.id.in_(post_ids)).all()
    } if post_ids else {}
    reply_map = {}
    if post_ids:
        replies = (
            db.query(PostReply)
            .filter(PostReply.post_id.in_(post_ids), PostReply.user_id.in_(from_ids))
            .order_by(PostReply.created_at.desc())
            .all()
        )
        for r in replies:
            reply_map.setdefault((r.post_id, r.user_id), r)
    result = []
    for n in rows:
        from_user = users.get(n.from_user_id)
        badge_def = BADGE_DEFS.get(n.badge_key) if n.badge_key else None
        post = posts.get(n.post_id) if n.post_id else None
        post_content = post.content[:150] if post and len(post.content) > 150 else (post.content if post else None)
        reply = reply_map.get((n.post_id, n.from_user_id)) if n.type == "reply" and n.post_id else None
        reply_content = reply.content[:150] if reply and len(reply.content) > 150 else (reply.content if reply else None)
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
