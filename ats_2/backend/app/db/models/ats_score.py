from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class AtsScore(Base):
    __tablename__ = "ats_scores"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    score = Column(Float, nullable=False)
    matched_keywords = Column(JSONB, nullable=True)
    missing_keywords = Column(JSONB, nullable=True)
    explanation = Column(Text, nullable=True)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
