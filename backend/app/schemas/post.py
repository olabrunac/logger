from pydantic import BaseModel
from typing import Optional, List
import datetime


class PostCreate(BaseModel):
    content: str


class PostReplyCreate(BaseModel):
    content: str


class PostImageOut(BaseModel):
    id: int
    url: str
    is_gif: bool
    position: int

    class Config:
        from_attributes = True


class PostReplyOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    content: str
    created_at: str

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    content: str
    images: List[PostImageOut] = []
    replies_count: int = 0
    created_at: str

    class Config:
        from_attributes = True
