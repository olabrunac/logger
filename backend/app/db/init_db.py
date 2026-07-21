from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import SessionLocal

def init_db() -> None:
    db = SessionLocal()
    user = crud.user.get_by_username(db, username="admin")
    if not user:
        user_in = schemas.UserCreate(username="admin")
        crud.user.create(db, obj_in=user_in)
    db.close()
