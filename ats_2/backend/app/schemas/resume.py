from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class ResumeBase(BaseModel):
    job_id: int
    original_filename: str
    status: str
    error_reason: Optional[str] = None
    upload_batch_id: str

class ResumeResponse(ResumeBase):
    id: int
    uploaded_at: datetime
    storage_key: str
    score: Optional[float] = None
    company_fit_score: Optional[float] = None

    class Config:
        from_attributes = True

class ResumeBatchResponse(BaseModel):
    message: str
    batch_id: str
    file_count: int
