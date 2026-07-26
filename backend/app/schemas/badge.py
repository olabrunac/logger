from pydantic import BaseModel


class UserBadgeOut(BaseModel):
    key: str
    title: str
    description: str
    icon: str
    category: str
    rarity: str
    unlocked_at: str

    class Config:
        from_attributes = True


class BadgeProgressOut(BaseModel):
    key: str
    title: str
    icon: str
    category: str
    rarity: str
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
    rarity: str
    unlocked_at: str
