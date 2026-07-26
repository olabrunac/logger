from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime


class UserFollow(Base):
    __tablename__ = "userfollow"

    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    following_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_user_follow"),
    )
