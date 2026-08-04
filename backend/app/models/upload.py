from sqlalchemy import Column, Integer, String, Boolean, DateTime, LargeBinary
from app.db.base import Base
import datetime


class UploadedFile(Base):
    __tablename__ = "uploadedfile"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True, nullable=False)
    content_type = Column(String, nullable=False)
    is_gif = Column(Boolean, default=False)
    data = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
