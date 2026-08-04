from pydantic import BaseModel, model_validator, EmailStr, field_validator
from typing import Optional
from datetime import date, datetime

# Shared properties
class UserBase(BaseModel):
    username: str

# Properties to receive on user creation (registration)
class UserCreate(UserBase):
    email: str
    password: str
    birth_date: Optional[date] = None

# Properties to receive on user update
class UserUpdate(BaseModel):
    username: Optional[str] = None
    banner_url: Optional[str] = None
    avatar_url: Optional[str] = None
    accent_color: Optional[str] = None
    section_order: Optional[str] = None
    social_links: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    trophy_showcase: Optional[str] = None
    birth_date: Optional[date] = None

    @field_validator('bio')
    @classmethod
    def validate_bio_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 100:
            raise ValueError('Biografia deve ter no máximo 100 caracteres')
        return v

# Login request
class LoginRequest(BaseModel):
    email_or_username: str
    password: str

# Password reset request
class ForgotPasswordRequest(BaseModel):
    email: str

# Password reset
class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Change email
class ChangeEmailRequest(BaseModel):
    current_password: str
    new_email: str

# Change password
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Properties to return to client
class User(UserBase):
    id: int
    email: Optional[str] = None
    banner_url: Optional[str] = None
    avatar_url: Optional[str] = None
    accent_color: Optional[str] = "#ff6b35"
    section_order: Optional[str] = None
    social_links: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    trophy_showcase: Optional[str] = '[]'
    birth_date: Optional[date] = None
    birth_date_updated_at: Optional[datetime] = None
    followers_count: int = 0
    following_count: int = 0

    @model_validator(mode='after')
    def ensure_accent_color(self):
        if not self.accent_color:
            self.accent_color = "#ff6b35"
        if not self.trophy_showcase:
            self.trophy_showcase = '[]'
        return self

    class Config:
        from_attributes = True
