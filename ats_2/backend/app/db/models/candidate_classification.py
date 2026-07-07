from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.sql import func
from app.db.base import Base

class CandidateClassification(Base):
    __tablename__ = "candidate_classifications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    
    candidate_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    ats_score = Column(Float, nullable=True)
    company_fit_score = Column(Float, nullable=True)
    classification_status = Column(String, nullable=False) # Selected | Waitlisted | Rejected
    
    skills = Column(Text, nullable=True)
    experience = Column(String, nullable=True)
    education = Column(Text, nullable=True)
    
    rank = Column(Integer, nullable=True)
    ats_threshold = Column(Float, nullable=True)
    fit_threshold = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
