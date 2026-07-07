from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.job import Job
from app.db.models.resume import Candidate
from app.db.models.ats_score import AtsScore
from app.db.models.threshold import Threshold, ThresholdResult
from app.schemas.scoring import ThresholdCreate, ThresholdResponse, ApplyThresholdResponse
from app.services.threshold_engine import evaluate_threshold

router = APIRouter()

@router.post("/jobs/{id}/threshold", response_model=ThresholdResponse)
def create_threshold(
    id: int,
    threshold_in: ThresholdCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    threshold = db.query(Threshold).filter(Threshold.job_id == id).first()
    if threshold:
        threshold.rules = threshold_in.rules
        threshold.logic = threshold_in.logic
    else:
        threshold = Threshold(job_id=id, rules=threshold_in.rules, logic=threshold_in.logic)
        db.add(threshold)
        
    db.commit()
    db.refresh(threshold)
    return threshold

@router.get("/jobs/{id}/threshold", response_model=ThresholdResponse)
def get_threshold(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    threshold = db.query(Threshold).filter(Threshold.job_id == id).first()
    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not configured")
    return threshold

@router.post("/jobs/{id}/apply-threshold", response_model=ApplyThresholdResponse)
def apply_threshold(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    threshold = db.query(Threshold).filter(Threshold.job_id == id).first()
    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not configured")
        
    candidates = db.query(Candidate).filter(Candidate.job_id == id).all()
    
    for c in candidates:
        # Build candidate data dict containing what threshold engine queries
        score_record = db.query(AtsScore).filter(AtsScore.candidate_id == c.id).first()
        data = {
            "score": score_record.score if score_record else 0,
            "cgpa": float(c.cgpa) if c.cgpa else 0,
            "experience_years": c.experience_years or 0,
            "notice_period": c.notice_period_days or 0
        }
        
        result = evaluate_threshold(threshold.rules, threshold.logic, data)
        
        t_result = db.query(ThresholdResult).filter(ThresholdResult.candidate_id == c.id).first()
        if not t_result:
            t_result = ThresholdResult(candidate_id=c.id, job_id=id)
            db.add(t_result)
            
        t_result.passed = result["passed"]
        t_result.failed_rules = result["failed_rules"]
        
    db.commit()
    return {"message": "Threshold applied to all candidates"}
