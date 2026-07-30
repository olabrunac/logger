from pydantic import BaseModel
from typing import Optional


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    from_user_id: Optional[int] = None
    from_username: Optional[str] = None
    from_avatar_url: Optional[str] = None
    post_id: Optional[int] = None
    badge_key: Optional[str] = None
    badge_title: Optional[str] = None
    badge_icon: Optional[str] = None
    badge_rarity: Optional[str] = None
    read: bool
    created_at: str

    class Config:
        from_attributes = True
