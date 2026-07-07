from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from datetime import datetime

class AtsScoreResponse(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    score: float
    matched_keywords: Optional[List[str]] = None
    missing_keywords: Optional[List[str]] = None
    explanation: Optional[str] = None
    computed_at: datetime

    class Config:
        from_attributes = True

class CandidateRankingResponse(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    cgpa: Optional[str] = None
    experience_years: Optional[int] = None
    education: Optional[Any] = None
    is_shortlisted: Optional[bool] = False
    score: Optional[AtsScoreResponse] = None
    company_fit: Optional[Dict[str, Any]] = None

class ThresholdCreate(BaseModel):
    rules: List[Dict[str, Any]]
    logic: str = "AND"

class ThresholdResponse(ThresholdCreate):
    id: int
    job_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ApplyThresholdResponse(BaseModel):
    message: str
