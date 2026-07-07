from pydantic import BaseModel
from datetime import datetime

class ReportCreate(BaseModel):
    format: str # 'csv', 'xlsx', 'pdf'
    classification: str = None # 'selected' | 'waitlisted' | 'rejected'

class ReportResponse(BaseModel):
    id: int
    job_id: int
    generated_by: int
    format: str
    storage_key: str
    created_at: datetime

    class Config:
        from_attributes = True
