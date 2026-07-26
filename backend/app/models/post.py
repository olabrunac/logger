from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime


class Post(Base):
    __tablename__ = "post"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", backref="posts")
    images = relationship("PostImage", back_populates="post", cascade="all, delete-orphan")
    replies = relationship("PostReply", back_populates="post", cascade="all, delete-orphan")


class PostImage(Base):
    __tablename__ = "postimage"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("post.id"), nullable=False, index=True)
    url = Column(String, nullable=False)
    is_gif = Column(Boolean, default=False)
    position = Column(Integer, default=0)

    post = relationship("Post", back_populates="images")


class PostReply(Base):
    __tablename__ = "postreply"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("post.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    post = relationship("Post", back_populates="replies")
    user = relationship("User")


class PostLike(Base):
    __tablename__ = "postlike"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("post.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = ({"unique_together": ("post_id", "user_id")},)
