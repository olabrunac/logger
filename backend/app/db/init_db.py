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

    db.close()
