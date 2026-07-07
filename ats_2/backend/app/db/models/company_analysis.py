from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.sql import func
from app.db.base import Base

class CompanyAnalysis(Base):
    __tablename__ = "company_analysis"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    company_context = Column(Text, nullable=False)
    fit_score = Column(Float, nullable=False)
    rationale = Column(Text, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
