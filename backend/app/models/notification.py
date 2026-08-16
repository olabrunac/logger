import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Notification(Base):
    __tablename__ = "notification"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    from_user_id = Column(Integer, ForeignKey("user.id"), nullable=True, index=True)
    post_id = Column(Integer, ForeignKey("post.id"), nullable=True, index=True)
    log_id = Column(Integer, ForeignKey("logentry.id"), nullable=True, index=True)
    media_item_id = Column(Integer, ForeignKey("mediaitem.id"), nullable=True, index=True)
    sale_discount_percent = Column(Integer, nullable=True)
    sale_price = Column(String, nullable=True)
    badge_key = Column(String, nullable=True)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    from_user = relationship("User", foreign_keys=[from_user_id])
    post = relationship("Post")
    log = relationship("LogEntry")
    media_item = relationship("MediaItem")
