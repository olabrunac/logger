from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import crud, schemas
from app.api import deps

router = APIRouter()

@router.post("/", response_model=schemas.User)
def login_or_create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
):
    """
    Find a user by username, or create a new one.
    """
    user = crud.user.get_by_username(db, username=user_in.username)
    if not user:
        user = crud.user.create(db, obj_in=user_in)
    return user


@router.get("/by-username/{username}", response_model=schemas.User)
def get_user_by_username(
    *,
    db: Session = Depends(deps.get_db),
    username: str,
):
    """
    Get a user by username.
    """
    user = crud.user.get_by_username(db, username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
