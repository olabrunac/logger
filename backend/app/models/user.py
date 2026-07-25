from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.db.base import Base
import datetime

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    banner_url = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    accent_color = Column(String, default="#ff6b35")
    section_order = Column(Text, default='["favorites","trophy_showcase","recent","reviews","library","activity","stats","genre_chart"]')
    
    logs = relationship("LogEntry", back_populates="user")
    top_list_items = relationship("TopListItem", back_populates="user", cascade="all, delete-orphan")
    custom_lists = relationship("CustomList", back_populates="user", cascade="all, delete-orphan")
