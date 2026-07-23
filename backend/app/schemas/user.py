from pydantic import BaseModel
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
    accent_color: Optional[str] = "#ff6b35"
    section_order: Optional[str] = None

    class Config:
        from_attributes = True
