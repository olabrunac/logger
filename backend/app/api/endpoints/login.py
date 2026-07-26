from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
from app import crud, schemas
from app.api import deps
from app.models.user import User

router = APIRouter()

RESET_TOKEN_EXPIRY_HOURS = 24


def _enrich_user(user: User, db: Session) -> dict:
    from app.crud import crud_follow
    data = schemas.User.model_validate(user).model_dump()
    data["followers_count"] = crud_follow.get_follower_count(db, user.id)
    data["following_count"] = crud_follow.get_following_count(db, user.id)
    return data


@router.post("/register")
def register(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
):
    """Register a new user with email and password."""
    existing = crud.user.get_by_username(db, username=user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    existing_email = crud.user.get_by_email(db, email=user_in.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = crud.user.create(db, obj_in=user_in)
    return _enrich_user(user, db)


@router.post("/")
def login(
    *,
    db: Session = Depends(deps.get_db),
    login_data: schemas.LoginRequest,
):
    """Login with email/username and password. Allows username-only login for 'bruna' during dev."""
    # Dev shortcut: allow username-only login for bruna
    if login_data.email_or_username == "bruna" and login_data.password == "":
        user = crud.user.get_by_username(db, username="bruna")
        if user:
            return _enrich_user(user, db)

    user = crud.user.get_by_username(db, username=login_data.email_or_username)
    if not user:
        user = crud.user.get_by_email(db, email=login_data.email_or_username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.password_hash:
        raise HTTPException(status_code=401, detail="Account has no password set. Please reset your password.")
    if not crud.user.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _enrich_user(user, db)


@router.get("/by-username/{username}")
def get_user_by_username(
    *,
    db: Session = Depends(deps.get_db),
    username: str,
):
    """Get a user by username."""
    user = crud.user.get_by_username(db, username=username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _enrich_user(user, db)


@router.post("/forgot-password")
def forgot_password(
    *,
    db: Session = Depends(deps.get_db),
    data: schemas.ForgotPasswordRequest,
):
    """Request a password reset token."""
    user = crud.user.get_by_email(db, email=data.email)
    if not user:
        return {"message": "If an account with that email exists, a reset link has been sent."}
    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_expires = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)
    db.add(user)
    db.commit()
    return {"message": "If an account with that email exists, a reset link has been sent.", "token": token}


@router.post("/reset-password")
def reset_password(
    *,
    db: Session = Depends(deps.get_db),
    data: schemas.ResetPasswordRequest,
):
    """Reset password using a token."""
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if user.password_reset_expires and user.password_reset_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user.password_hash = crud.user.hash_password(data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.add(user)
    db.commit()
    return {"message": "Password reset successfully"}
