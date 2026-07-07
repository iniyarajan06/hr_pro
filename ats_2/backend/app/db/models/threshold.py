from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base

class Threshold(Base):
    __tablename__ = "thresholds"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    rules = Column(JSONB, nullable=False) # Example: [{"field": "score", "op": ">=", "value": 70}, ...]
    logic = Column(String, nullable=False, default="AND") # AND | OR
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ThresholdResult(Base):
    __tablename__ = "threshold_results"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    passed = Column(Boolean, nullable=False)
    failed_rules = Column(JSONB, nullable=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())
