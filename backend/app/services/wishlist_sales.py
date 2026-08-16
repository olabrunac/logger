import datetime

from sqlalchemy.orm import Session

from app.models.media import LogEntry, LogStatus, MediaItem, MediaType
from app.services import igdb_service, steam_service
from app.crud.crud_notification import create_notification

# Desconto mínimo (em %) para disparar a notificação de promoção.
MIN_SALE_DISCOUNT = 20

_PRICE_CHUNK_SIZE = 20


def _resolve_missing_appids(db: Session, items) -> None:
    """Resolve steam_appid via IGDB para jogos da wishlist sem appid."""
    for item in items:
        if item.steam_appid or not item.igdb_id:
            continue
        try:
            appid = igdb_service.get_steam_appid(item.igdb_id)
        except Exception as e:
            print(f"Error resolving steam appid for igdb {item.igdb_id}: {e}")
            continue
        if appid:
            item.steam_appid = appid


def check_wishlist_prices(db: Session) -> dict:
    """Verifica preços dos jogos da wishlist (status wishlist) e notifica quando um
    jogo entra em promoção (desconto >= MIN_SALE_DISCOUNT) desde a última checagem.

    A primeira checagem de um jogo é apenas baseline (não notifica) — evita spam de
    promoções antigas. Notifica uma vez por usuário/jogo (dedup em create_notification)."""
    wishlist_logs = (
        db.query(LogEntry)
        .join(MediaItem, LogEntry.media_item_id == MediaItem.id)
        .filter(
            LogEntry.status == LogStatus.WISHLIST,
            MediaItem.media_type == MediaType.GAME,
        )
        .all()
    )
    if not wishlist_logs:
        return {"checked": 0, "sales": 0}

    media_by_id = {l.media_item_id: l.media_item for l in wishlist_logs}
    items = list(media_by_id.values())

    _resolve_missing_appids(db, items)
    db.flush()

    items_by_appid = {}
    for item in items:
        if item.steam_appid:
            items_by_appid.setdefault(item.steam_appid, item)

    prices = {}
    appids = list(items_by_appid.keys())
    for i in range(0, len(appids), _PRICE_CHUNK_SIZE):
        prices.update(steam_service.get_app_prices(appids[i:i + _PRICE_CHUNK_SIZE]))

    now = datetime.datetime.utcnow()
    notified = 0
    for appid, item in items_by_appid.items():
        price = prices.get(appid)
        if price is None:
            continue
        discount = price["discount_percent"]
        final_formatted = price["final_formatted"]
        was_checked = item.steam_price_checked_at is not None
        prev_discount = item.steam_discount_percent or 0

        if was_checked and discount >= MIN_SALE_DISCOUNT and prev_discount < MIN_SALE_DISCOUNT:
            for log in wishlist_logs:
                if log.media_item_id != item.id:
                    continue
                create_notification(
                    db,
                    user_id=log.user_id,
                    type="wishlist_sale",
                    media_item_id=item.id,
                    sale_discount_percent=discount,
                    sale_price=final_formatted,
                )
            notified += 1

        item.steam_price = final_formatted
        item.steam_discount_percent = discount
        item.steam_price_checked_at = now

    db.commit()
    return {"checked": len(items_by_appid), "sales": notified}
