from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.job import Job
from app.db.models.resume import Candidate
from app.db.models.ats_score import AtsScore
from app.schemas.scoring import AtsScoreResponse, CandidateRankingResponse
from app.tasks.score_task import score_batch

router = APIRouter()

@router.post("/jobs/{id}/score", status_code=status.HTTP_202_ACCEPTED)
def trigger_scoring(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Trigger Async Task
    score_batch.delay(id)
    return {"message": "Scoring queued"}

from typing import Optional
@router.get("/jobs/{id}/ranking")
def get_job_ranking(
    id: int,
    min_score: Optional[int] = None,
    min_cgpa: Optional[float] = None,
    min_experience_years: Optional[int] = None,
    education: Optional[str] = None,
    skills: Optional[str] = None,
    certifications: Optional[str] = None,
    sort_by: Optional[str] = "ats",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    print(f"[Logging: Rank Stage] Fetching Candidate Rankings for Job {id}")
    candidates = db.query(Candidate).filter(Candidate.job_id == id).all()
    results = []
    
    # We could optimize this with joins.
    from app.db.models.company_analysis import CompanyAnalysis
    
    for c in candidates:
        score_record = db.query(AtsScore).filter(AtsScore.candidate_id == c.id).first()
        comp_record = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == c.id).first()
        
        res_dict = {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "experience_years": c.experience_years,
            "cgpa": c.cgpa,
            "education": c.education,
            "skills": c.skills,
            "current_company": c.current_company,
            "previous_companies": c.previous_companies,
            "projects": c.projects,
            "certifications": c.certifications,
            "is_shortlisted": c.is_shortlisted,
            "score": score_record,
            "company_fit": {
                "fit_score": comp_record.fit_score,
                "rationale": comp_record.rationale
            } if comp_record else None
        }

        # Apply Filters Dynamically
        if min_score is not None:
            if not score_record or score_record.score < min_score:
                continue
        if min_cgpa is not None and c.cgpa is not None:
            try:
                if float(c.cgpa) < min_cgpa: continue
            except: pass
        if min_experience_years is not None:
            if c.experience_years is None or c.experience_years < min_experience_years:
                continue
        if education is not None and education.strip():
            edu_str = str(c.education).lower() if c.education else ""
            if education.strip().lower() not in edu_str:
                continue
        if skills is not None and skills.strip():
            sk_str = str(c.skills).lower() if c.skills else ""
            sk_queries = [s.strip().lower() for s in skills.split(',')]
            if not any(sq in sk_str for sq in sk_queries):
                continue
        if certifications is not None and certifications.strip():
            cert_str = str(c.certifications).lower() if c.certifications else ""
            cert_queries = [s.strip().lower() for s in certifications.split(',')]
            if not any(cq in cert_str for cq in cert_queries):
                continue
                
        results.append(res_dict)
        
    if sort_by == "compatibility":
        results.sort(key=lambda x: x["company_fit"]["fit_score"] if x.get("company_fit") else 0, reverse=True)
    else:
        results.sort(key=lambda x: x["score"].score if x["score"] else 0, reverse=True)
        
    return results[skip: skip + limit]

@router.get("/jobs/{id}/available-scores")
def get_available_scores(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    from app.db.models.company_analysis import CompanyAnalysis
    
    ats_scores = db.query(AtsScore.score).join(Candidate).filter(Candidate.job_id == id).distinct().all()
    fit_scores = db.query(CompanyAnalysis.fit_score).filter(CompanyAnalysis.job_id == id).distinct().all()
    
    return {
        "ats_scores": sorted([round(s[0]) for s in ats_scores]),
        "fit_scores": sorted([round(s[0]) for s in fit_scores])
    }

@router.get("/candidates/{id}/score", response_model=AtsScoreResponse)
def get_candidate_score(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    score = db.query(AtsScore).filter(AtsScore.candidate_id == id).first()
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    return score
