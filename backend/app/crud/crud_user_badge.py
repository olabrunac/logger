from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user_badge import UserBadge
from app.core.badge_definitions import BADGE_DEFS


def get_user_badges(db: Session, user_id: int) -> List[UserBadge]:
    return db.query(UserBadge).filter(UserBadge.user_id == user_id).all()


def has_badge(db: Session, user_id: int, badge_key: str) -> bool:
    return db.query(UserBadge).filter(UserBadge.user_id == user_id, UserBadge.badge_key == badge_key).first() is not None


def unlock_badge(db: Session, user_id: int, badge_key: str) -> UserBadge:
    if has_badge(db, user_id, badge_key):
        return db.query(UserBadge).filter(UserBadge.user_id == user_id, UserBadge.badge_key == badge_key).first()
    badge = UserBadge(user_id=user_id, badge_key=badge_key)
    db.add(badge)
    db.commit()
    db.refresh(badge)
    return badge


def _count_completed_by_type(db: Session, user_id: int, media_type: str) -> int:
    from app.models.media import LogEntry, LogStatus, MediaItem
    return (
        db.query(func.count(LogEntry.id))
        .join(MediaItem, LogEntry.media_item_id == MediaItem.id)
        .filter(
            LogEntry.user_id == user_id,
            MediaItem.media_type == media_type,
            LogEntry.status.in_([LogStatus.COMPLETED, LogStatus.PLATINATED]),
        )
        .scalar()
    )


def _count_platinated(db: Session, user_id: int) -> int:
    from app.models.media import LogEntry, LogStatus
    return (
        db.query(func.count(LogEntry.id))
        .filter(LogEntry.user_id == user_id, LogEntry.status == LogStatus.PLATINATED)
        .scalar()
    )


def _count_reviews(db: Session, user_id: int) -> int:
    from app.models.media import LogEntry
    return (
        db.query(func.count(LogEntry.id))
        .filter(
            LogEntry.user_id == user_id,
            ((LogEntry.rating.isnot(None) & (LogEntry.rating > 0)) | (LogEntry.review.isnot(None) & (LogEntry.review != "")))
        )
        .scalar()
    )


def _calc_streak(db: Session, user_id: int) -> int:
    from app.models.media import LogEntry
    dates_raw = (
        db.query(func.date(LogEntry.log_date))
        .filter(LogEntry.user_id == user_id, LogEntry.log_date.isnot(None))
        .distinct()
        .order_by(func.date(LogEntry.log_date).desc())
        .all()
    )
    if not dates_raw:
        return 0
    dates = []
    for d in dates_raw:
        if isinstance(d[0], str):
            dates.append(datetime.strptime(d[0], "%Y-%m-%d").date())
        else:
            dates.append(d[0])
    today = datetime.utcnow().date()
    streak = 0
    expected = today
    first = True
    for d in dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        elif first and d == expected - timedelta(days=1):
            expected = d
            streak += 1
            expected -= timedelta(days=1)
        else:
            break
        first = False
    return streak


def _count_followers(db: Session, user_id: int) -> int:
    from app.models.user_follow import UserFollow
    return db.query(func.count(UserFollow.id)).filter(UserFollow.following_id == user_id).scalar()


def _has_posts(db: Session, user_id: int) -> bool:
    from app.models.post import Post
    return db.query(Post).filter(Post.user_id == user_id).first() is not None


def _total_logs(db: Session, user_id: int) -> int:
    from app.models.media import LogEntry, LogStatus
    return (
        db.query(func.count(LogEntry.id))
        .filter(LogEntry.user_id == user_id, LogEntry.status.notin_([LogStatus.WISHLIST, LogStatus.SOON]))
        .scalar()
    )


def _has_all_types(db: Session, user_id: int) -> bool:
    from app.models.media import LogEntry, LogStatus, MediaItem
    types = (
        db.query(MediaItem.media_type)
        .join(LogEntry, LogEntry.media_item_id == MediaItem.id)
        .filter(LogEntry.user_id == user_id, LogEntry.status.notin_([LogStatus.WISHLIST, LogStatus.SOON]))
        .distinct()
        .all()
    )
    return len(types) >= 4


def _count_favorites(db: Session, user_id: int) -> int:
    from app.models.media import LogEntry
    return db.query(func.count(LogEntry.id)).filter(LogEntry.user_id == user_id, LogEntry.is_favorite == True).scalar()


def check_and_unlock(db: Session, user_id: int) -> List[dict]:
    from app.core.badge_definitions import BADGE_DEFS
    unlocked_keys = {b.badge_key for b in get_user_badges(db, user_id)}
    new_badges = []

    counts = {
        "movie": _count_completed_by_type(db, user_id, "movie"),
        "series": _count_completed_by_type(db, user_id, "series"),
        "game": _count_completed_by_type(db, user_id, "game"),
        "book": _count_completed_by_type(db, user_id, "book"),
    }
    platina_count = _count_platinated(db, user_id)
    review_count = _count_reviews(db, user_id)
    streak = _calc_streak(db, user_id)
    follower_count = _count_followers(db, user_id)
    has_post = _has_posts(db, user_id)
    total = _total_logs(db, user_id)
    all_types = _has_all_types(db, user_id)
    fav_count = _count_favorites(db, user_id)

    checks = []
    for media_type in ["movie", "series", "game", "book"]:
        for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
            checks.append((f"{media_type}_{t}", counts[media_type] >= t))
    for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]:
        checks.append((f"platina_{t}", platina_count >= t))
    for t in [1, 10, 50, 100, 250, 500, 1000]:
        checks.append((f"review_{t}", review_count >= t))
    for t in [7, 30, 90, 180, 365, 730, 1095]:
        checks.append((f"streak_{t}", streak >= t))
    checks.append(("first_follower", follower_count >= 1))
    checks.append(("10_followers", follower_count >= 10))
    checks.append(("50_followers", follower_count >= 50))
    checks.append(("100_followers", follower_count >= 100))
    checks.append(("250_followers", follower_count >= 250))
    checks.append(("500_followers", follower_count >= 500))
    checks.append(("first_post", has_post))
    checks.append(("first_log", total >= 1))
    checks.append(("total_100", total >= 100))
    checks.append(("total_500", total >= 500))
    checks.append(("total_1000", total >= 1000))
    checks.append(("omnivoro", all_types))
    checks.append(("fav_5", fav_count >= 5))
    checks.append(("fav_25", fav_count >= 25))
    checks.append(("fav_100", fav_count >= 100))
    checks.append(("fav_250", fav_count >= 250))

    for key, condition in checks:
        if condition and key not in unlocked_keys and key in BADGE_DEFS:
            badge = unlock_badge(db, user_id, key)
            defn = BADGE_DEFS[key]
            new_badges.append({
                "key": key,
                "title": defn.title,
                "description": defn.description,
                "icon": defn.icon,
                "rarity": defn.rarity,
                "unlocked_at": badge.unlocked_at.isoformat() if badge.unlocked_at else "",
            })

    return new_badges


def get_user_badges_with_progress(db: Session, user_id: int) -> dict:
    unlocked = get_user_badges(db, user_id)
    unlocked_keys = {b.badge_key for b in unlocked}

    unlocked_list = []
    for b in unlocked:
        defn = BADGE_DEFS.get(b.badge_key)
        if defn:
            unlocked_list.append({
                "key": b.badge_key,
                "title": defn.title,
                "description": defn.description,
                "icon": defn.icon,
                "category": defn.category,
                "rarity": defn.rarity,
                "unlocked_at": b.unlocked_at.isoformat() if b.unlocked_at else "",
            })

    counts = {
        "movie": _count_completed_by_type(db, user_id, "movie"),
        "series": _count_completed_by_type(db, user_id, "series"),
        "game": _count_completed_by_type(db, user_id, "game"),
        "book": _count_completed_by_type(db, user_id, "book"),
    }
    platina_count = _count_platinated(db, user_id)
    review_count = _count_reviews(db, user_id)
    streak = _calc_streak(db, user_id)
    follower_count = _count_followers(db, user_id)
    total = _total_logs(db, user_id)
    fav_count = _count_favorites(db, user_id)

    progress_map = {
        "movie": counts["movie"], "series": counts["series"],
        "game": counts["game"], "book": counts["book"],
        "platina": platina_count, "review": review_count,
        "streak": streak, "follower": follower_count,
        "total": total, "fav": fav_count,
    }

    next_milestones = []
    media_thresholds = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
    for media_type in ["movie", "series", "game", "book"]:
        current = counts[media_type]
        for t in media_thresholds:
            key = f"{media_type}_{t}"
            if key not in unlocked_keys and key in BADGE_DEFS:
                defn = BADGE_DEFS[key]
                next_milestones.append({
                    "key": key, "title": defn.title, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": current, "target": t,
                })
                break

    for prefix, current in [("platina", platina_count), ("review", review_count), ("streak", streak), ("fav", fav_count)]:
        thresholds = [1, 5, 10, 25, 50, 100, 250, 500, 1000] if prefix == "platina" else [1, 10, 50, 100, 250, 500, 1000] if prefix == "review" else [7, 30, 90, 180, 365, 730, 1095] if prefix == "streak" else [5, 25, 100, 250]
        for t in thresholds:
            key = f"{prefix}_{t}"
            if key not in unlocked_keys and key in BADGE_DEFS:
                defn = BADGE_DEFS[key]
                next_milestones.append({
                    "key": key, "title": defn.title, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": current, "target": t,
                })
                break

    follower_thresholds = [
        ("first_follower", 1), ("10_followers", 10), ("50_followers", 50), ("100_followers", 100),
        ("250_followers", 250), ("500_followers", 500)
    ]
    for key, t in follower_thresholds:
        if key not in unlocked_keys and key in BADGE_DEFS:
            defn = BADGE_DEFS[key]
            next_milestones.append({
                "key": key, "title": defn.title, "icon": defn.icon,
                "category": defn.category,
                "rarity": defn.rarity,
                "current": follower_count, "target": t,
            })
            break

    for key in ["first_post", "first_log", "omnivoro", "total_100", "total_500", "total_1000"]:
        if key not in unlocked_keys and key in BADGE_DEFS:
            defn = BADGE_DEFS[key]
            if key == "omnivoro":
                next_milestones.append({
                    "key": key, "title": defn.title, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": sum(1 for v in counts.values() if v > 0), "target": 4,
                })
            elif key == "first_post":
                next_milestones.append({
                    "key": key, "title": defn.title, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": 0 if not _has_posts(db, user_id) else 1, "target": 1,
                })
            else:
                next_milestones.append({
                    "key": key, "title": defn.title, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": min(total, defn.threshold), "target": defn.threshold,
                })

    return {"unlocked": unlocked_list, "next_milestones": next_milestones}
