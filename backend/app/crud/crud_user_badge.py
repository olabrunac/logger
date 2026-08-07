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


def _compute_badge_counts(db: Session, user_id: int) -> dict:
    """Calcula todos os contadores de badges com queries em lote
    (evita ~12 counts + N por série quando chamado por log/import)."""
    from app.models.media import LogEntry, LogStatus, MediaItem
    from app.models.post import Post
    from sqlalchemy.orm import joinedload
    from app.services.hours_service import effective_hours_batch

    non_log = [LogStatus.WISHLIST, LogStatus.SOON]

    completed_rows = (
        db.query(MediaItem.media_type, func.count(LogEntry.id))
        .join(LogEntry, LogEntry.media_item_id == MediaItem.id)
        .filter(
            LogEntry.user_id == user_id,
            LogEntry.status.in_([LogStatus.COMPLETED, LogStatus.PLATINATED]),
        )
        .group_by(MediaItem.media_type)
        .all()
    )
    completed_by_type = {mt.value: c for mt, c in completed_rows}

    platina = db.query(func.count(LogEntry.id)).filter(
        LogEntry.user_id == user_id, LogEntry.status == LogStatus.PLATINATED
    ).scalar()

    reviews = db.query(func.count(LogEntry.id)).filter(
        LogEntry.user_id == user_id,
        ((LogEntry.rating.isnot(None) & (LogEntry.rating > 0)) | (LogEntry.review.isnot(None) & (LogEntry.review != ""))),
    ).scalar()

    total = db.query(func.count(LogEntry.id)).filter(
        LogEntry.user_id == user_id, LogEntry.status.notin_(non_log)
    ).scalar()

    fav = db.query(func.count(LogEntry.id)).filter(
        LogEntry.user_id == user_id, LogEntry.is_favorite == True, LogEntry.status.notin_(non_log)
    ).scalar()

    type_count = (
        db.query(MediaItem.media_type)
        .join(LogEntry, LogEntry.media_item_id == MediaItem.id)
        .filter(LogEntry.user_id == user_id, LogEntry.status.notin_(non_log))
        .distinct()
        .count()
    )

    hours_logs = db.query(LogEntry).options(joinedload(LogEntry.media_item)).filter(
        LogEntry.user_id == user_id,
        LogEntry.status.notin_(non_log),
    ).all()
    hours = round(sum(v or 0 for v in effective_hours_batch(db, hours_logs).values()), 1)

    return {
        "movie": completed_by_type.get("movie", 0),
        "series": completed_by_type.get("series", 0),
        "game": completed_by_type.get("game", 0),
        "book": completed_by_type.get("book", 0),
        "platina": platina or 0,
        "reviews": reviews or 0,
        "streak": _calc_streak(db, user_id),
        "followers": _count_followers(db, user_id),
        "total": total or 0,
        "fav": fav or 0,
        "hours": hours or 0,
        "has_posts": db.query(Post.id).filter(Post.user_id == user_id).first() is not None,
        "all_types": type_count >= 4,
    }


def check_and_unlock(db: Session, user_id: int) -> List[dict]:
    from app.core.badge_definitions import BADGE_DEFS
    unlocked_keys = {b.badge_key for b in get_user_badges(db, user_id)}
    new_badges = []

    counts_map = _compute_badge_counts(db, user_id)
    counts = {mt: counts_map[mt] for mt in ["movie", "series", "game", "book"]}
    platina_count = counts_map["platina"]
    review_count = counts_map["reviews"]
    streak = counts_map["streak"]
    follower_count = counts_map["followers"]
    has_post = counts_map["has_posts"]
    total = counts_map["total"]
    all_types = counts_map["all_types"]
    fav_count = counts_map["fav"]
    total_hours = counts_map["hours"]

    def _upgrade_group(keyed_thresholds: list[tuple[str, int]], current_value: int):
        best_key = None
        for key, t in keyed_thresholds:
            if current_value >= t:
                best_key = key
        if best_key is None:
            return
        old_keys = [k for k, _ in keyed_thresholds if k != best_key and k in unlocked_keys]
        for ok in old_keys:
            db.query(UserBadge).filter(UserBadge.user_id == user_id, UserBadge.badge_key == ok).delete()
            unlocked_keys.discard(ok)
        if best_key not in unlocked_keys and best_key in BADGE_DEFS:
            badge = unlock_badge(db, user_id, best_key)
            defn = BADGE_DEFS[best_key]
            new_badges.append({
                "key": best_key,
                "title": defn.title,
                "description": defn.description,
                "icon": defn.icon,
                "rarity": defn.rarity,
                "unlocked_at": badge.unlocked_at.isoformat() if badge.unlocked_at else "",
            })

    _upgrade_group([(f"movie_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["movie"])
    _upgrade_group([(f"series_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["series"])
    _upgrade_group([(f"game_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["game"])
    _upgrade_group([(f"book_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["book"])
    _upgrade_group([(f"platina_{t}", t) for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]], platina_count)
    _upgrade_group([(f"review_{t}", t) for t in [1, 10, 50, 100, 250, 500, 1000]], review_count)
    _upgrade_group([(f"streak_{t}", t) for t in [7, 30, 90, 180, 365, 730, 1095]], streak)
    _upgrade_group([(f"logs_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], total)
    _upgrade_group([(f"fav_{t}", t) for t in [5, 25, 100, 250]], fav_count)
    _upgrade_group([(f"hours_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], int(total_hours))
    _upgrade_group([("first_follower", 1), ("10_followers", 10), ("50_followers", 50), ("100_followers", 100), ("250_followers", 250), ("500_followers", 500)], follower_count)

    checks = []
    checks.append(("first_post", has_post))
    checks.append(("omnivoro", all_types))

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

    if new_badges:
        try:
            from app.crud.crud_notification import create_notification
            for b in new_badges:
                create_notification(db, user_id=user_id, type="badge", badge_key=b["key"])
        except Exception:
            pass

    fav_remove_keys = []
    fav_thresholds = [("fav_5", 5), ("fav_25", 25), ("fav_100", 100), ("fav_250", 250)]
    for key, threshold in fav_thresholds:
        if key in unlocked_keys and fav_count < threshold:
            db.query(UserBadge).filter(UserBadge.user_id == user_id, UserBadge.badge_key == key).delete()
            fav_remove_keys.append(key)
    if fav_remove_keys:
        db.commit()

    return new_badges


def get_user_badges_with_progress(db: Session, user_id: int) -> dict:
    unlocked = get_user_badges(db, user_id)
    unlocked_keys = {b.badge_key for b in unlocked}

    counts_map = _compute_badge_counts(db, user_id)
    counts = {mt: counts_map[mt] for mt in ["movie", "series", "game", "book"]}
    platina_count = counts_map["platina"]
    review_count = counts_map["reviews"]
    streak = counts_map["streak"]
    follower_count = counts_map["followers"]
    total = counts_map["total"]
    fav_count = counts_map["fav"]
    total_hours = counts_map["hours"]

    # Build unlocked badge list with a lookup map
    unlocked_list = []
    unlocked_by_key = {}
    for b in unlocked:
        defn = BADGE_DEFS.get(b.badge_key)
        if defn:
            d = {
                "key": b.badge_key,
                "title": defn.title,
                "description": defn.description,
                "icon": defn.icon,
                "category": defn.category,
                "rarity": defn.rarity,
                "unlocked_at": b.unlocked_at.isoformat() if b.unlocked_at else "",
            }
            unlocked_list.append(d)
            unlocked_by_key[b.badge_key] = d

    next_milestones = []

    def _handle_group(keyed_thresholds: list[tuple[str, int]], current: int):
        highest_key = None
        highest_tier = 0
        next_key = None
        next_tier = 0
        for key, t in keyed_thresholds:
            if key in unlocked_keys and t > highest_tier:
                highest_tier = t
                highest_key = key
        for key, t in keyed_thresholds:
            if key not in unlocked_keys and key in BADGE_DEFS and t > highest_tier and t > current:
                if next_key is None or t < next_tier:
                    next_tier = t
                    next_key = key
        if highest_key and next_key:
            ub = unlocked_by_key.get(highest_key)
            if ub:
                defn = BADGE_DEFS[next_key]
                ub["next_current"] = current
                ub["next_target"] = next_tier
                ub["next_title"] = defn.title
                ub["next_rarity"] = defn.rarity
        elif next_key and not highest_key:
            defn = BADGE_DEFS[next_key]
            next_milestones.append({
                "key": next_key, "title": defn.title, "description": defn.description, "icon": defn.icon,
                "category": defn.category,
                "rarity": defn.rarity,
                "current": current, "target": next_tier,
            })

    _handle_group([(f"movie_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["movie"])
    _handle_group([(f"series_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["series"])
    _handle_group([(f"game_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["game"])
    _handle_group([(f"book_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], counts["book"])
    _handle_group([(f"platina_{t}", t) for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]], platina_count)
    _handle_group([(f"review_{t}", t) for t in [1, 10, 50, 100, 250, 500, 1000]], review_count)
    _handle_group([(f"streak_{t}", t) for t in [7, 30, 90, 180, 365, 730, 1095]], streak)
    _handle_group([(f"logs_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], total)
    _handle_group([(f"fav_{t}", t) for t in [5, 25, 100, 250]], fav_count)
    _handle_group([(f"hours_{t}", t) for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]], int(total_hours))
    _handle_group([("first_follower", 1), ("10_followers", 10), ("50_followers", 50), ("100_followers", 100), ("250_followers", 250), ("500_followers", 500)], follower_count)

    for key in ["first_post", "omnivoro"]:
        if key not in unlocked_keys and key in BADGE_DEFS:
            defn = BADGE_DEFS[key]
            if key == "omnivoro":
                next_milestones.append({
                    "key": key, "title": defn.title, "description": defn.description, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": sum(1 for mt in ["movie", "series", "game", "book"] if counts[mt] > 0), "target": 4,
                })
            elif key == "first_post":
                next_milestones.append({
                    "key": key, "title": defn.title, "description": defn.description, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": 0 if not counts_map["has_posts"] else 1, "target": 1,
                })
            elif key.startswith("hours_"):
                next_milestones.append({
                    "key": key, "title": defn.title, "description": defn.description, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": total_hours, "target": defn.threshold,
                })
            else:
                next_milestones.append({
                    "key": key, "title": defn.title, "description": defn.description, "icon": defn.icon,
                    "category": defn.category,
                    "rarity": defn.rarity,
                    "current": min(total, defn.threshold), "target": defn.threshold,
                })

    return {"unlocked": unlocked_list, "next_milestones": next_milestones}
