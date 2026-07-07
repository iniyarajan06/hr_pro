import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.job import Job
from app.db.models.report import Report
from app.schemas.report import ReportCreate, ReportResponse
from app.tasks.export_task import generate_export_task
from app.core.config import settings

router = APIRouter()

@router.post("/jobs/{id}/reports/export")
def generate_and_download_report(
    id: int,
    payload: ReportCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    print(f"[Export Audit] Job ID: {id}, Format: {payload.format}, Classification: {payload.classification}")
    
    import uuid
    from app.db.models.resume import Candidate
    from app.db.models.ats_score import AtsScore
    from app.db.models.company_analysis import CompanyAnalysis
    from app.services.exporter import generate_csv, generate_xlsx, generate_pdf
    
    job = db.query(Job).filter(Job.id == id).first()
    if not job: 
        print(f"[Export Error] Job {id} not found.")
        raise HTTPException(status_code=404, detail="Job not found")

    from app.db.models.candidate_classification import CandidateClassification
    from app.services.exporter import generate_csv, generate_xlsx, generate_pdf
    
    job = db.query(Job).filter(Job.id == id).first()
    if not job: 
        print(f"[Export Error] Job {id} not found.")
        raise HTTPException(status_code=404, detail="Job not found")

    # Fetch ONLY saved classifications for this job
    query = db.query(CandidateClassification).filter(CandidateClassification.job_id == id)
    if payload.classification:
        query = query.filter(CandidateClassification.classification_status.ilike(payload.classification))
    
    saved_records = query.all()
    print(f"[Export Audit] Saved classifications found: {len(saved_records)}")
    
    if not saved_records:
        # Check if ANY classifications exist for this job at all
        any_exist = db.query(CandidateClassification).filter(CandidateClassification.job_id == id).first()
        if not any_exist:
            raise HTTPException(status_code=400, detail="Please run Batch Scoring and Save Classifications before exporting.")
        else:
            # Maybe the specific category is empty
            print(f"[Export Warning] No saved records for category: {payload.classification}")

    data = []
    for r in saved_records:
        data.append({
            "name": r.candidate_name or "N/A",
            "email": r.email or "N/A",
            "score": f"{round(r.ats_score)}%" if r.ats_score is not None else "0%",
            "fit_score": f"{round(r.company_fit_score)}%" if r.company_fit_score is not None else "0%",
            "status": r.classification_status,
            "skills": r.skills or "N/A",
            "experience": r.experience or "N/A",
            "education": r.education or "N/A"
        })
    
    print(f"[Export Audit] Prepared data rows: {len(data)}")
    
    # Sort by ATS score (highest first)
    data.sort(key=lambda x: float(x["score"].replace('%','')), reverse=True)
    
    report_id = str(uuid.uuid4())
    filename = f"report_{id}_{payload.classification or 'full'}_{report_id}.{payload.format}"
    storage_key = f"reports/{id}/{filename}"
    target_path = os.path.join(settings.STORAGE_LOCAL_PATH, storage_key)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)

    try:
        if payload.format == "csv": generate_csv(data, target_path)
        elif payload.format == "xlsx": generate_xlsx(data, target_path)
        elif payload.format == "pdf": generate_pdf(data, target_path)
        else: raise HTTPException(status_code=400, detail="Invalid format")
        print(f"[Export Audit] File generated: {target_path}")
    except Exception as e:
        print(f"[Export Error] File generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    # Log the report in DB
    report = Report(job_id=id, generated_by=current_user.id, format=payload.format, storage_key=storage_key)
    db.add(report)
    db.commit()

    return FileResponse(target_path, filename=filename, media_type='application/octet-stream')

@router.get("/jobs/{id}/reports", response_model=List[ReportResponse])
def list_reports(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    reports = db.query(Report).filter(Report.job_id == id).all()
    return reports

@router.get("/reports/{id}/download")
def download_report(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    filepath = os.path.join(settings.STORAGE_LOCAL_PATH, report.storage_key)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(filepath, filename=os.path.basename(report.storage_key))
