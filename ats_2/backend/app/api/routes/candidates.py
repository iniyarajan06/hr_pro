from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.resume import Candidate, Resume
from app.db.models.ats_score import AtsScore
from app.db.models.company_analysis import CompanyAnalysis

router = APIRouter()

@router.get("/candidates/{id}")
def get_candidate_detail(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    resume = db.query(Resume).filter(Resume.id == candidate.resume_id).first()
    score_record = db.query(AtsScore).filter(AtsScore.candidate_id == id).first()
    company_fit = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == id).first()

    return {
        "id": candidate.id,
        "name": candidate.name,
        "email": candidate.email,
        "phone": candidate.phone,
        "skills": candidate.skills or [],
        "education": candidate.education or [],
        "experience_years": candidate.experience_years,
        "current_company": candidate.current_company,
        "previous_companies": candidate.previous_companies or [],
        "projects": candidate.projects or [],
        "cgpa": candidate.cgpa,
        "certifications": candidate.certifications or [],
        "location": candidate.location,
        "notice_period_days": candidate.notice_period_days,
        "parsed_text": candidate.parsed_text,
        "resume": {
            "id": resume.id,
            "original_filename": resume.original_filename,
            "storage_key": resume.storage_key,
            "status": resume.status,
        } if resume else None,
        "score": {
            "score": score_record.score,
            "matched_keywords": score_record.matched_keywords,
            "missing_keywords": score_record.missing_keywords,
            "explanation": score_record.explanation,
        } if score_record else None,
        "company_fit": {
            "fit_score": company_fit.fit_score,
            "rationale": company_fit.rationale,
        } if company_fit else None,
    }

from pydantic import BaseModel
from typing import List

class ShortlistUpdate(BaseModel):
    is_shortlisted: bool

class ClassificationSave(BaseModel):
    candidate_id: int
    candidate_name: str
    email: str
    ats_score: float
    company_fit_score: float
    classification_status: str
    skills: str
    experience: str
    education: str
    rank: int = None
    ats_threshold: float = None
    fit_threshold: float = None

class ClassificationBatch(BaseModel):
    classifications: List[ClassificationSave]

@router.post("/jobs/{id}/classifications")
def save_classifications(
    id: int,
    data: ClassificationBatch,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    from app.db.models.candidate_classification import CandidateClassification
    
    for item in data.classifications:
        existing = db.query(CandidateClassification).filter(
            CandidateClassification.job_id == id,
            CandidateClassification.candidate_id == item.candidate_id
        ).first()
        
        if existing:
            existing.ats_score = item.ats_score
            existing.company_fit_score = item.company_fit_score
            existing.classification_status = item.classification_status
            existing.candidate_name = item.candidate_name
            existing.email = item.email
            existing.skills = item.skills
            existing.experience = item.experience
            existing.education = item.education
            existing.rank = item.rank
            existing.ats_threshold = item.ats_threshold
            existing.fit_threshold = item.fit_threshold
        else:
            new_c = CandidateClassification(
                job_id=id,
                candidate_id=item.candidate_id,
                candidate_name=item.candidate_name,
                email=item.email,
                ats_score=item.ats_score,
                company_fit_score=item.company_fit_score,
                classification_status=item.classification_status,
                skills=item.skills,
                experience=item.experience,
                education=item.education,
                rank=item.rank,
                ats_threshold=item.ats_threshold,
                fit_threshold=item.fit_threshold
            )
            db.add(new_c)
            
    db.commit()
    return {"message": f"Successfully saved {len(data.classifications)} classifications."}

@router.put("/candidates/{id}/shortlist")
def toggle_shortlist(
    id: int,
    data: ShortlistUpdate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate.is_shortlisted = data.is_shortlisted
    db.commit()
    db.refresh(candidate)
    
    return {"message": "Candidate shortlist status updated", "is_shortlisted": candidate.is_shortlisted}
