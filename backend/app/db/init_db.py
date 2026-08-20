import secrets

from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import SessionLocal
from app.core.config import settings

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

    def _add_column(table: str, column: str, sql: str) -> bool:
        if column in _columns(table):
            return False
        try:
            db.execute(text(sql))
            db.commit()
            print(f"[init_db] added: {sql}")
            return True
        except Exception as exc:
            db.rollback()
            print(f"[init_db] failed: {sql} -> {exc}")
            return False

    def _exec(sql: str) -> None:
        try:
            db.execute(text(sql))
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[init_db] skipped: {sql} -> {exc}")

    def _exec_orm(query) -> None:
        try:
            query.update({LogEntry.hours_spent: None}, synchronize_session=False)
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[init_db] skipped (orm): {exc}")

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
    _add_column('logentry', 'exclude_from_stats', 'ALTER TABLE logentry ADD COLUMN exclude_from_stats BOOLEAN DEFAULT FALSE')
    _migrated_created_at = _add_column('logentry', 'created_at', 'ALTER TABLE logentry ADD COLUMN created_at TIMESTAMP')
    if _migrated_created_at:
        _exec("UPDATE logentry SET created_at = log_date WHERE created_at IS NULL")
        _exec("CREATE INDEX IF NOT EXISTS ix_logentry_created_at ON logentry (created_at)")
    _add_column('mediaitem', 'steam_discount_percent', 'ALTER TABLE mediaitem ADD COLUMN steam_discount_percent INTEGER')
    _add_column('mediaitem', 'steam_price_checked_at', 'ALTER TABLE mediaitem ADD COLUMN steam_price_checked_at TIMESTAMP')
    _add_column('notification', 'log_id', 'ALTER TABLE notification ADD COLUMN log_id INTEGER')
    _add_column('notification', 'media_item_id', 'ALTER TABLE notification ADD COLUMN media_item_id INTEGER')
    _add_column('notification', 'sale_discount_percent', 'ALTER TABLE notification ADD COLUMN sale_discount_percent INTEGER')
    _add_column('notification', 'sale_price', 'ALTER TABLE notification ADD COLUMN sale_price VARCHAR')

    # Reset das buscas populares: entradas antigas são só strings (termo digitado,
    # sem referência de mídia). Apaga tudo só quando a migração das colunas roda
    # (primeira vez), para não zerar os dados a cada deploy/restart.
    _migrated_searchterm = _add_column('searchterm', 'media_type', 'ALTER TABLE searchterm ADD COLUMN media_type VARCHAR')
    _add_column('searchterm', 'tmdb_id', 'ALTER TABLE searchterm ADD COLUMN tmdb_id INTEGER')
    _add_column('searchterm', 'igdb_id', 'ALTER TABLE searchterm ADD COLUMN igdb_id INTEGER')
    _add_column('searchterm', 'google_books_id', 'ALTER TABLE searchterm ADD COLUMN google_books_id VARCHAR')
    _add_column('searchterm', 'steam_appid', 'ALTER TABLE searchterm ADD COLUMN steam_appid INTEGER')
    _add_column('searchterm', 'cover_image_url', 'ALTER TABLE searchterm ADD COLUMN cover_image_url VARCHAR')
    if _migrated_searchterm:
        _exec("DELETE FROM searchterm")

    # Badge de primeiro log removida do sistema de badges (tabela real: userbadge)
    _exec("DELETE FROM userbadge WHERE badge_key = 'first_log'")

    # Badges de horas reajustadas (agora começam em 100h — 100/500/1000/5000/...):
    # apaga tiers antigos que não existem mais no BADGE_DEFS (10/25/50/250/2500h)
    # para não ficarem órfãos (sem definição, sem display).
    _exec("DELETE FROM userbadge WHERE badge_key IN ('hours_10', 'hours_25', 'hours_50', 'hours_250', 'hours_2500')")

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
    _exec("CREATE INDEX IF NOT EXISTS ix_notification_log_id ON notification (log_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_notification_media_item_id ON notification (media_item_id)")

    # Episode timeline events (new table — created by create_all, indexes for queries)
    _exec("CREATE INDEX IF NOT EXISTS ix_episodetimelineevent_user_id ON episodetimelineevent (user_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_episodetimelineevent_media_item_id ON episodetimelineevent (media_item_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_episodetimelineevent_created_at ON episodetimelineevent (created_at)")
    _exec("CREATE INDEX IF NOT EXISTS ix_episodetimelineevent_log_id ON episodetimelineevent (log_id)")

    # Episode event replies/likes: allow log_id to be nullable, add episode_event_id
    _add_column('logreply', 'episode_event_id', 'ALTER TABLE logreply ADD COLUMN episode_event_id INTEGER')
    _add_column('loglike', 'episode_event_id', 'ALTER TABLE loglike ADD COLUMN episode_event_id INTEGER')
    _exec("CREATE INDEX IF NOT EXISTS ix_logreply_episode_event_id ON logreply (episode_event_id)")
    _exec("CREATE INDEX IF NOT EXISTS ix_loglike_episode_event_id ON loglike (episode_event_id)")

    # Deduplicate orphaned episode timeline events (same user+log+season+ep)
    _exec("""
        DELETE FROM episodetimelineevent WHERE id NOT IN (
            SELECT MIN(id) FROM episodetimelineevent
            GROUP BY user_id, log_id, season_number, episode_start, episode_end
        )
    """)

    # Capas de livros antigas salvas com http:// — Chrome bloqueia mixed content
    # em produção (https), então normaliza tudo para https de uma vez.
    _exec("UPDATE mediaitem SET cover_image_url = 'https://' || substr(cover_image_url, 8) WHERE cover_image_url LIKE 'http://%'")

    # Filmes/séries: horas são sempre derivadas da própria mídia (runtime, e
    # runtime × episódios assistidos para séries). Limpa horas manuais antigas
    # para o effective_hours recomputar o valor automático.
    # Usa ORM (não SQL cru): no Postgres media_type é enum nativo ('mediatype')
    # e comparação com string literal quebra com InvalidTextRepresentation.
    from app.models.media import LogEntry, MediaItem, MediaType
    _exec_orm(
        db.query(LogEntry)
        .filter(
            LogEntry.media_item_id.in_(
                db.query(MediaItem.id).filter(
                    MediaItem.media_type.in_([MediaType.MOVIE, MediaType.SERIES])
                )
            )
        )
    )

    # Auto-upgrade completed games with 100% achievements to platinated
    _exec("""
        UPDATE logentry SET status = 'platinated' WHERE id IN (
            SELECT le.id FROM logentry le
            JOIN mediaitem mi ON mi.id = le.media_item_id
            JOIN achievement a ON a.log_id = le.id
            WHERE mi.media_type = 'game' AND le.status = 'completed'
            GROUP BY le.id
            HAVING COUNT(a.id) > 0
               AND SUM(CASE WHEN a.unlocked = 1 THEN 1 ELSE 0 END) = COUNT(a.id)
        )
    """)

    # Seed admin user
    admin = crud.user.get_by_username(db, username="admin")
    if not admin:
        admin_password = settings.ADMIN_PASSWORD or secrets.token_urlsafe(16)
        admin_in = schemas.UserCreate(username="admin", email="admin@logger.dev", password=admin_password)
        admin = crud.user.create(db, obj_in=admin_in)
        print(f"Admin user created: admin@logger.dev (password from ADMIN_PASSWORD env or random)")
    elif not admin.password_hash:
        admin.email = "admin@logger.dev"
        admin.password_hash = crud.user.hash_password(settings.ADMIN_PASSWORD or secrets.token_urlsafe(16))
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
