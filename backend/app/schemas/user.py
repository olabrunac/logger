from pydantic import BaseModel, model_validator, EmailStr
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    username: str

# Properties to receive on user creation (registration)
class UserCreate(UserBase):
    email: str
    password: str

# Properties to receive on user update
class UserUpdate(BaseModel):
    username: Optional[str] = None
    banner_url: Optional[str] = None
    avatar_url: Optional[str] = None
    accent_color: Optional[str] = None
    section_order: Optional[str] = None

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
    accent_color: str = "#ff6b35"
    section_order: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0

    @model_validator(mode='after')
    def ensure_accent_color(self):
        if not self.accent_color:
            self.accent_color = "#ff6b35"
        return self

    class Config:
        from_attributes = True
