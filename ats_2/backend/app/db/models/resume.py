from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    original_filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    upload_batch_id = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="uploaded") # uploaded | parsing | parsed | failed
    error_reason = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    name = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    parsed_text = Column(String, nullable=True)
    skills = Column(JSONB, nullable=True)
    education = Column(JSONB, nullable=True)
    experience_years = Column(Integer, nullable=True)
    current_company = Column(String, nullable=True)
    previous_companies = Column(JSONB, nullable=True)
    projects = Column(JSONB, nullable=True)
    cgpa = Column(String, nullable=True)
    certifications = Column(JSONB, nullable=True)
    location = Column(String, nullable=True)
    notice_period_days = Column(Integer, nullable=True)
    is_shortlisted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
