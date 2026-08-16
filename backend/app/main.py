import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from starlette.requests import Request
from sqlalchemy import func
from app.core.config import settings
from app.api.v1_router import api_router
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db.init_db import init_db
from app.models.media import LogEntry, LogStatus, LogReview

def create_tables():
    Base.metadata.create_all(bind=engine)

def dedup_log_entries():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        non_wishlist = [LogStatus.WISHLIST, LogStatus.SOON]
        dup_groups = db.query(
            LogEntry.user_id,
            LogEntry.media_item_id,
            func.count(LogEntry.id).label('cnt'),
        ).filter(
            LogEntry.status.notin_(non_wishlist)
        ).group_by(
            LogEntry.user_id, LogEntry.media_item_id
        ).having(func.count(LogEntry.id) > 1).all()

        removed = 0
        for user_id, media_item_id, cnt in dup_groups:
            entries = db.query(LogEntry).filter(
                LogEntry.user_id == user_id,
                LogEntry.media_item_id == media_item_id,
                LogEntry.status.notin_(non_wishlist),
            ).order_by(LogEntry.relog_count.desc(), LogEntry.log_date.desc()).all()
            keep = entries[0]
            for dup in entries[1:]:
                db.delete(dup)
                removed += 1
        if removed:
            db.commit()
            print(f"Dedup: removed {removed} duplicate log entries")
    except Exception as e:
        db.rollback()
        print(f"Dedup error: {e}")
    finally:
        db.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serve_upload(filename: str):
    safe_name = os.path.basename(filename.replace("\\", "/"))
    db = SessionLocal()
    try:
        from app.crud.crud_upload import get_file
        record = get_file(db, safe_name)
        if record:
            return Response(content=bytes(record.data), media_type=record.content_type)
    finally:
        db.close()

    filepath = os.path.join("uploads", safe_name)
    if os.path.isfile(filepath):
        return FileResponse(filepath)

    raise HTTPException(status_code=404, detail="File not found")


os.makedirs("uploads", exist_ok=True)
app.get("/uploads/{filename}")(serve_upload)

app.include_router(api_router, prefix=settings.API_V1_STR)

frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="frontend_assets")

    class SpaFallbackMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            if request.url.path.startswith("/api/") or request.url.path.startswith("/uploads/"):
                return await call_next(request)
            response: Response = await call_next(request)
            if response.status_code == 404:
                index_path = os.path.join(frontend_dist, "index.html")
                if os.path.isfile(index_path):
                    return FileResponse(index_path, media_type="text/html")
            return response

    app.add_middleware(SpaFallbackMiddleware)

def _run_wishlist_sale_check():
    from app.services.wishlist_sales import check_wishlist_prices
    db = SessionLocal()
    try:
        result = check_wishlist_prices(db)
        print(f"[wishlist-sales] checked {result['checked']} games, {result['sales']} sale notification(s)")
    except Exception as e:
        print(f"[wishlist-sales] error: {e}")
    finally:
        db.close()


async def _wishlist_sale_loop():
    await asyncio.sleep(settings.WISHLIST_SALE_CHECK_FIRST_DELAY_SECONDS)
    while True:
        await asyncio.to_thread(_run_wishlist_sale_check)
        await asyncio.sleep(settings.WISHLIST_SALE_CHECK_INTERVAL_HOURS * 3600)


@app.on_event("startup")
def on_startup():
    create_tables()
    init_db()
    dedup_log_entries()
    asyncio.get_event_loop().create_task(_wishlist_sale_loop())

