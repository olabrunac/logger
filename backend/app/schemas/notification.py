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
    post_content: Optional[str] = None
    reply_content: Optional[str] = None
    log_id: Optional[int] = None
    log_title: Optional[str] = None
    log_cover: Optional[str] = None
    log_media_type: Optional[str] = None
    log_api_id: Optional[str] = None
    log_reply_content: Optional[str] = None
    badge_key: Optional[str] = None
    badge_title: Optional[str] = None
    badge_icon: Optional[str] = None
    badge_rarity: Optional[str] = None
    read: bool
    created_at: str

    class Config:
        from_attributes = True
