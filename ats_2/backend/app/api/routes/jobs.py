from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.job import Job
from app.db.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobResponse
from app.services.jd_generator import generate_jd
from app.services.keyword_extractor import extract_keywords

router = APIRouter()

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    keyword_dicts = [k.dict() for k in job_in.ats_keywords] if job_in.ats_keywords else None
    
    db_job = Job(
        title=job_in.title,
        questionnaire=job_in.questionnaire,
        jd_text=job_in.jd_text,
        ats_keywords=keyword_dicts,
        status=job_in.status,
        created_by=current_user.id
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

@router.get("", response_model=List[JobResponse])
def get_jobs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # Depending on requirements, we might want to let any recruiter see all jobs or only theirs.
    # We will let everyone see all jobs for simplicity unless specified.
    jobs = db.query(Job).offset(skip).limit(limit).all()
    return jobs

@router.get("/{id}", response_model=JobResponse)
def get_job(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.put("/{id}", response_model=JobResponse)
def update_job(
    id: int,
    job_in: JobUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = job_in.dict(exclude_unset=True)
    if "ats_keywords" in update_data and update_data["ats_keywords"] is not None:
        update_data["ats_keywords"] = [k for k in update_data["ats_keywords"]] # Already dicts if parsed, wait, Pydantic parses them to dicts with .dict() on parent, but let's be safe
        
    for field, value in update_data.items():
        setattr(job, field, value)
        
    db.commit()
    db.refresh(job)
    return job

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()

@router.post("/{id}/generate-jd", response_model=JobResponse)
def generate_job_description(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.questionnaire:
        raise HTTPException(status_code=400, detail="Job questionnaire is required to generate JD")
    
    jd_text = generate_jd(job.questionnaire)
    job.jd_text = jd_text
    db.commit()
    db.refresh(job)
    return job

@router.post("/{id}/extract-keywords", response_model=JobResponse)
def extract_job_keywords(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.jd_text:
        raise HTTPException(status_code=400, detail="Job description text is required to extract keywords")
    
    keywords = extract_keywords(job.jd_text)
    job.ats_keywords = keywords
    db.commit()
    db.refresh(job)
    return job

from pydantic import BaseModel
class UrlInput(BaseModel):
    url: str

@router.post("/{id}/analyze-company", response_model=JobResponse)
def analyze_company(
    id: int,
    payload: UrlInput,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from app.services.company_analyzer import analyze_company_website
    
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    context = analyze_company_website(payload.url)
    
    job.company_url = payload.url
    job.company_context = context
    db.commit()
    db.refresh(job)
    
    return job
@router.post("/{id}/recalculate-scores")
def recalculate_job_scores(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from app.db.models.resume import Candidate
    from app.db.models.ats_score import AtsScore
    from app.db.models.company_analysis import CompanyAnalysis
    from app.services.ats_engine import calculate_ats_score
    from app.services.company_analyzer import calculate_company_compatibility
    
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    candidates = db.query(Candidate).filter(Candidate.job_id == id).all()
    
    for cand in candidates:
        # 1. Recalculate ATS Score
        if job.jd_text:
            ats_res = calculate_ats_score(
                job.jd_text, 
                cand.parsed_text or "", 
                job.ats_keywords or [],
                {"skills": cand.skills, "experience_years": cand.experience_years, 
                 "education": cand.education, "certifications": cand.certifications}
            )
            score_rec = db.query(AtsScore).filter(AtsScore.candidate_id == cand.id).first()
            if not score_rec:
                score_rec = AtsScore(candidate_id=cand.id, job_id=id)
                db.add(score_rec)
            score_rec.score = ats_res["score"]
            score_rec.matched_keywords = ats_res["matched_keywords"]
            score_rec.missing_keywords = ats_res["missing_keywords"]
            score_rec.explanation = ats_res["explanation"]
            
        # 2. Recalculate Company Fit (if context exists)
        if job.company_context:
            fit_res = calculate_company_compatibility(
                job.company_context,
                {"skills": cand.skills, "experience_years": cand.experience_years, 
                 "education": cand.education, "certifications": cand.certifications},
                cand.parsed_text or ""
            )
            fit_rec = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == cand.id).first()
            if not fit_rec:
                fit_rec = CompanyAnalysis(candidate_id=cand.id, job_id=id)
                db.add(fit_rec)
            fit_rec.company_context = str(job.company_context)
            fit_rec.fit_score = fit_res.get("fit_score", 0.0)
            fit_rec.rationale = fit_res.get("rationale", "")
            
    db.commit()
    return {"message": f"Successfully recalculated scores for {len(candidates)} candidates"}


@router.get("/{id}/summary")
def get_job_summary(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    from app.db.models.candidate_classification import CandidateClassification
    from sqlalchemy import func
    
    total = db.query(CandidateClassification).filter(CandidateClassification.job_id == id).count()
    selected = db.query(CandidateClassification).filter(CandidateClassification.job_id == id, CandidateClassification.classification_status == 'Selected').count()
    waitlisted = db.query(CandidateClassification).filter(CandidateClassification.job_id == id, CandidateClassification.classification_status == 'Waitlisted').count()
    rejected = db.query(CandidateClassification).filter(CandidateClassification.job_id == id, CandidateClassification.classification_status == 'Rejected').count()
    
    avg_ats = db.query(func.avg(CandidateClassification.ats_score)).filter(CandidateClassification.job_id == id).scalar() or 0
    avg_fit = db.query(func.avg(CandidateClassification.company_fit_score)).filter(CandidateClassification.job_id == id).scalar() or 0
    
    return {
        "total_candidates": total,
        "selected": selected,
        "waitlisted": waitlisted,
        "rejected": rejected,
        "average_ats": round(float(avg_ats), 2),
        "average_company_fit": round(float(avg_fit), 2)
    }
