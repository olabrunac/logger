from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime

class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    birth_date = Column(Date, nullable=True)
    
    banner_url = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    accent_color = Column(String, default="#ff6b35")
    section_order = Column(Text, default='["in_progress","completed","wishlist","dropped","reviews","lists"]')
    social_links = Column(Text, nullable=True)
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    trophy_showcase = Column(Text, default='[]')

    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    
    logs = relationship("LogEntry", back_populates="user")
    top_list_items = relationship("TopListItem", back_populates="user", cascade="all, delete-orphan")
    custom_lists = relationship("CustomList", back_populates="user", cascade="all, delete-orphan")
