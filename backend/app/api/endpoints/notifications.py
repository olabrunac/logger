from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.crud import crud_notification
from app.crud.crud_user import user as crud_user

router = APIRouter()


@router.get("/{user_id}")
def get_notifications(*, db: Session = Depends(deps.get_db), user_id: int, limit: int = 50, offset: int = 0):
    user = crud_user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud_notification.get_notifications(db, user_id, limit=limit, offset=offset)


@router.get("/{user_id}/unread-count")
def get_unread_count(*, db: Session = Depends(deps.get_db), user_id: int):
    return {"count": crud_notification.get_unread_count(db, user_id)}


@router.put("/{notification_id}/read")
def mark_read(*, db: Session = Depends(deps.get_db), notification_id: int, user_id: int):
    ok = crud_notification.mark_read(db, notification_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/read-all/{user_id}")
def mark_all_read(*, db: Session = Depends(deps.get_db), user_id: int):
    crud_notification.mark_all_read(db, user_id)
    return {"message": "All notifications marked as read"}
