from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    format = Column(String, nullable=False) # csv | xlsx | pdf
    storage_key = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
