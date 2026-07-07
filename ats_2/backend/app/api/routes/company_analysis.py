from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.job import Job
from app.db.models.company_analysis import CompanyAnalysis
from app.schemas.company_analysis import CompanyAnalysisCreate, CompanyAnalysisResponse
from app.tasks.company_fit_task import generate_company_analysis

router = APIRouter()

@router.post("/jobs/{id}/company-analysis", status_code=status.HTTP_202_ACCEPTED)
def request_company_analysis(
    id: int,
    payload: CompanyAnalysisCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    generate_company_analysis.delay(id, payload.company_context, payload.candidate_ids)
    return {"message": "Company fit analysis queued"}

@router.get("/candidates/{id}/company-fit", response_model=CompanyAnalysisResponse)
def get_company_fit(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    analysis = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Company analysis not found")
    return analysis
