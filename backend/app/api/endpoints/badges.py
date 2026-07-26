from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import crud_user_badge
from app.crud.crud_user import user as crud_user

router = APIRouter()


@router.get("/user/{user_id}")
def get_user_badges(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud_user_badge.get_user_badges_with_progress(db, user_id)


@router.post("/check/{user_id}")
def check_badges(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_badges = crud_user_badge.check_and_unlock(db, user_id)
    return {"new_badges": new_badges, "count": len(new_badges)}
