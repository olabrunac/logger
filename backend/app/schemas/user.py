from pydantic import BaseModel
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    username: str

# Properties to receive on user creation
class UserCreate(UserBase):
    pass

# Properties to receive on user update
class UserUpdate(UserBase):
    pass

# Properties to return to client
class User(UserBase):
    id: int

    class Config:
        from_attributes = True
