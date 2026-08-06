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

    def _columns(table: str) -> set:
        try:
            if db.bind.dialect.name == "sqlite":
                rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
                return {r[1] for r in rows}
            rows = db.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = :t"
            ), {"t": table}).fetchall()
            return {r[0] for r in rows}
        except Exception:
            return set()

    def _add_column(table: str, column: str, sql: str) -> None:
        if column in _columns(table):
            return
        try:
            db.execute(text(sql))
            db.commit()
            print(f"[init_db] added: {sql}")
        except Exception as exc:
            db.rollback()
            print(f"[init_db] failed: {sql} -> {exc}")

    def _exec(sql: str) -> None:
        try:
            db.execute(text(sql))
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[init_db] skipped: {sql} -> {exc}")

    _add_column('"user"', 'email', 'ALTER TABLE "user" ADD COLUMN email VARCHAR')
    _add_column('"user"', 'password_hash', 'ALTER TABLE "user" ADD COLUMN password_hash VARCHAR')
    _add_column('"user"', 'password_reset_token', 'ALTER TABLE "user" ADD COLUMN password_reset_token VARCHAR')
    _add_column('"user"', 'password_reset_expires', 'ALTER TABLE "user" ADD COLUMN password_reset_expires TIMESTAMP')
    _add_column('"user"', 'social_links', 'ALTER TABLE "user" ADD COLUMN social_links TEXT')
    _add_column('mediaitem', 'total_episodes', 'ALTER TABLE mediaitem ADD COLUMN total_episodes INTEGER')
    _add_column('episodewatched', 'review_text', 'ALTER TABLE episodewatched ADD COLUMN review_text TEXT')
    _add_column('episodewatched', 'rating', 'ALTER TABLE episodewatched ADD COLUMN rating FLOAT')
    _add_column('episodewatched', 'air_date', 'ALTER TABLE episodewatched ADD COLUMN air_date VARCHAR')
    _add_column('mediaitem', 'time_to_beat', 'ALTER TABLE mediaitem ADD COLUMN time_to_beat TEXT')
    _add_column('mediaitem', 'similar_games', 'ALTER TABLE mediaitem ADD COLUMN similar_games TEXT')
    _add_column('"user"', 'trophy_showcase', 'ALTER TABLE "user" ADD COLUMN trophy_showcase TEXT DEFAULT \'[]\'')
    _add_column('"user"', 'birth_date', 'ALTER TABLE "user" ADD COLUMN birth_date DATE')
    _add_column('"user"', 'birth_date_updated_at', 'ALTER TABLE "user" ADD COLUMN birth_date_updated_at TIMESTAMP')
    _add_column('"user"', 'banner_position', 'ALTER TABLE "user" ADD COLUMN banner_position VARCHAR')

    # Badge de primeiro log removida do sistema de badges (tabela real: userbadge)
    _exec("DELETE FROM userbadge WHERE badge_key = 'first_log'")

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
