from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import SessionLocal

def init_db() -> None:
    db = SessionLocal()

    # Migrate existing DB: add new columns if missing.
    # NOTE: `user` is a reserved keyword in PostgreSQL, so the table name must be
    # quoted ("user") or these ALTERs fail with a syntax error and the column is
    # never added. Each statement runs in its own transaction so a failure does
    # not abort the rest, and the error is logged instead of silently swallowed.
    from sqlalchemy import text

    def _migrate(sql: str) -> None:
        try:
            db.execute(text(sql))
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[init_db] skipped: {sql} -> {exc}")

    _migrate('ALTER TABLE "user" ADD COLUMN email VARCHAR')
    _migrate('ALTER TABLE "user" ADD COLUMN password_hash VARCHAR')
    _migrate('ALTER TABLE "user" ADD COLUMN password_reset_token VARCHAR')
    _migrate('ALTER TABLE "user" ADD COLUMN password_reset_expires TIMESTAMP')
    _migrate('ALTER TABLE "user" ADD COLUMN social_links TEXT')
    _migrate('ALTER TABLE mediaitem ADD COLUMN total_episodes INTEGER')
    _migrate('ALTER TABLE episodewatched ADD COLUMN review_text TEXT')
    _migrate('ALTER TABLE episodewatched ADD COLUMN rating FLOAT')
    _migrate('ALTER TABLE episodewatched ADD COLUMN air_date VARCHAR')
    _migrate('ALTER TABLE mediaitem ADD COLUMN time_to_beat TEXT')
    _migrate('ALTER TABLE mediaitem ADD COLUMN similar_games TEXT')
    _migrate('ALTER TABLE "user" ADD COLUMN trophy_showcase TEXT DEFAULT \'[]\'')
    _migrate('ALTER TABLE "user" ADD COLUMN birth_date DATE')
    _migrate('ALTER TABLE "user" ADD COLUMN birth_date_updated_at TIMESTAMP')

    # Badge de primeiro log removida do sistema de badges
    _migrate("DELETE FROM user_badge WHERE badge_key = 'first_log'")

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
