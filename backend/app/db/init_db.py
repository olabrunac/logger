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
            # information_schema stores the name without quotes; pass the plain name
            rows = db.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = :t"
            ), {"t": table.strip('"')}).fetchall()
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
    _add_column('mediaitem', 'authors', 'ALTER TABLE mediaitem ADD COLUMN authors JSON')
    _add_column('mediaitem', 'popularity', 'ALTER TABLE mediaitem ADD COLUMN popularity FLOAT')
    _add_column('"user"', 'trophy_showcase', 'ALTER TABLE "user" ADD COLUMN trophy_showcase TEXT DEFAULT \'[]\'')
    _add_column('"user"', 'birth_date', 'ALTER TABLE "user" ADD COLUMN birth_date DATE')
    _add_column('"user"', 'birth_date_updated_at', 'ALTER TABLE "user" ADD COLUMN birth_date_updated_at TIMESTAMP')
    _add_column('"user"', 'banner_position', 'ALTER TABLE "user" ADD COLUMN banner_position VARCHAR')
    _add_column('"user"', 'profile_public', 'ALTER TABLE "user" ADD COLUMN profile_public BOOLEAN DEFAULT TRUE')
    _add_column('"user"', 'show_game_library', 'ALTER TABLE "user" ADD COLUMN show_game_library BOOLEAN DEFAULT TRUE')
    _add_column('"user"', 'show_achievements', 'ALTER TABLE "user" ADD COLUMN show_achievements BOOLEAN DEFAULT TRUE')
    _add_column('"user"', 'show_hours', 'ALTER TABLE "user" ADD COLUMN show_hours BOOLEAN DEFAULT FALSE')
    _add_column('"user"', 'show_stats', 'ALTER TABLE "user" ADD COLUMN show_stats BOOLEAN DEFAULT TRUE')
    _add_column('logentry', 'family_share', 'ALTER TABLE logentry ADD COLUMN family_share BOOLEAN DEFAULT FALSE')

    # Badge de primeiro log removida do sistema de badges (tabela real: userbadge)
    _exec("DELETE FROM userbadge WHERE badge_key = 'first_log'")

    # Índices ausentes (performance: queries de logs/posts/notificações são
    # filtradas por user_id/log_id — sem índice, cada leitura é full scan)
    _exec("CREATE INDEX IF NOT EXISTS ix_logentry_user_id ON logentry (user_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_logentry_media_item_id ON logentry (media_item_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_logentry_log_date ON logentry (log_date)")
    _exec("CREATE INDEX IF NOT EXISTS ix_episodewatched_log_id ON episodewatched (log_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_achievement_log_id ON achievement (log_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_logreview_log_id ON logreview (log_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_top_list_item_user_id ON top_list_item (user_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_top_list_item_media_item_id ON top_list_item (media_item_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_custom_list_user_id ON custom_list (user_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_custom_list_item_custom_list_id ON custom_list_item (custom_list_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_custom_list_item_media_item_id ON custom_list_item (media_item_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_notification_from_user_id ON notification (from_user_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_notification_post_id ON notification (post_id)")

    # Capas de livros antigas salvas com http:// — Chrome bloqueia mixed content
    # em produção (https), então normaliza tudo para https de uma vez.
    _exec("UPDATE mediaitem SET cover_image_url = 'https://' || substr(cover_image_url, 8) WHERE cover_image_url LIKE 'http://%'")

    # Filmes/séries: horas são sempre derivadas da própria mídia (runtime, e
    # runtime × episódios assistidos para séries). Limpa horas manuais antigas
    # para o effective_hours recomputar o valor automático.
    _exec("UPDATE logentry SET hours_spent = NULL WHERE media_item_id IN (SELECT id FROM mediaitem WHERE media_type IN ('movie', 'series'))")

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
