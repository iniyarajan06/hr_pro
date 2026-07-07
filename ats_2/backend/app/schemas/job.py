from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

class Keyword(BaseModel):
    keyword: str
    weight: int

class JobBase(BaseModel):
    title: str
    questionnaire: Optional[Dict[str, Any]] = None
    jd_text: Optional[str] = None
    ats_keywords: Optional[List[Keyword]] = None
    company_url: Optional[str] = None
    company_context: Optional[Dict[str, Any]] = None
    status: str = "draft"

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    questionnaire: Optional[Dict[str, Any]] = None
    jd_text: Optional[str] = None
    ats_keywords: Optional[List[Keyword]] = None
    company_url: Optional[str] = None
    company_context: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class JobResponse(JobBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True
