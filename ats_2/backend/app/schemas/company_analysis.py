from typing import List
from pydantic import BaseModel
from datetime import datetime

class CompanyAnalysisCreate(BaseModel):
    company_context: str
    candidate_ids: List[int]

class CompanyAnalysisResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    company_context: str
    fit_score: float
    rationale: str
    computed_at: datetime

    class Config:
        from_attributes = True
