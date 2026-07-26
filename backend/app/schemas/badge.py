from pydantic import BaseModel
from typing import Optional


class UserBadgeOut(BaseModel):
    key: str
    title: str
    description: str
    icon: str
    category: str
    unlocked_at: str

    class Config:
        from_attributes = True


class BadgeProgressOut(BaseModel):
    key: str
    title: str
    icon: str
    category: str
    current: int
    target: int


class BadgeResponse(BaseModel):
    unlocked: list[UserBadgeOut]
    next_milestones: list[BadgeProgressOut]


class NewBadgeOut(BaseModel):
    key: str
    title: str
    description: str
    icon: str
    unlocked_at: str
