from pydantic import BaseModel, model_validator
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    username: str

# Properties to receive on user creation
class UserCreate(UserBase):
    pass

# Properties to receive on user update
class UserUpdate(BaseModel):
    username: Optional[str] = None
    banner_url: Optional[str] = None
    avatar_url: Optional[str] = None
    accent_color: Optional[str] = None
    section_order: Optional[str] = None

# Properties to return to client
class User(UserBase):
    id: int
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
