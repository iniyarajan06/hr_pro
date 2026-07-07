from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    questionnaire = Column(JSONB, nullable=True)
    jd_text = Column(Text, nullable=True)
    ats_keywords = Column(JSONB, nullable=True)
    company_url = Column(String, nullable=True)
    company_context = Column(JSONB, nullable=True)
    status = Column(String, nullable=False, default="draft") # draft | active | closed
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
