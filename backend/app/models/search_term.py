from sqlalchemy import Column, Integer, String, DateTime
from app.db.base import Base
import datetime


class SearchTerm(Base):
    __tablename__ = "searchterm"

    id = Column(Integer, primary_key=True, index=True)
    term = Column(String, unique=True, index=True, nullable=False)
    count = Column(Integer, default=1, nullable=False)
    last_searched_at = Column(DateTime, default=datetime.datetime.utcnow)
