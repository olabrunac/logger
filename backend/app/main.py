import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from app.core.config import settings
from app.api.v1_router import api_router
from app.db.session import engine
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

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_STR)

frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

@app.on_event("startup")
def on_startup():
    create_tables()
    init_db()
    dedup_log_entries()

