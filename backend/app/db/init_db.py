from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import SessionLocal

def init_db() -> None:
    db = SessionLocal()

    # Migrate existing DB: add new columns if missing
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE user ADD COLUMN email VARCHAR"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE user ADD COLUMN password_hash VARCHAR"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE user ADD COLUMN password_reset_token VARCHAR"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE user ADD COLUMN password_reset_expires DATETIME"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE user ADD COLUMN social_links TEXT"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE mediaitem ADD COLUMN total_episodes INTEGER"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE episodewatched ADD COLUMN review_text TEXT"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE episodewatched ADD COLUMN rating FLOAT"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE episodewatched ADD COLUMN air_date VARCHAR"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE mediaitem ADD COLUMN time_to_beat TEXT"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE mediaitem ADD COLUMN similar_games TEXT"))
    except Exception:
        pass
    try:
        db.execute(text("ALTER TABLE user ADD COLUMN trophy_showcase TEXT DEFAULT '[]'"))
    except Exception:
        pass
    db.commit()

    # Seed admin user
    admin = crud.user.get_by_username(db, username="admin")
    if not admin:
        admin_in = schemas.UserCreate(username="admin", email="admin@logger.dev", password="admin123")
        admin = crud.user.create(db, obj_in=admin_in)
        print(f"Admin user created: admin@logger.dev / admin123")
    elif not admin.password_hash:
        admin.email = "admin@logger.dev"
        admin.password_hash = crud.user.hash_password("admin123")
        db.add(admin)
        db.commit()
        print(f"Admin user migrated with password")

    # Seed dev badge for admin and bruna
    from app.crud.crud_user_badge import unlock_badge
    for username in ["admin", "bruna"]:
        u = crud.user.get_by_username(db, username=username)
        if u:
            unlock_badge(db, u.id, "dev")

    db.close()
