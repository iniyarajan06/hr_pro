import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
import os
from sqlalchemy.orm import Session
from app.api import deps
from app.db.models.resume import Resume
from app.db.models.job import Job
from app.schemas.resume import ResumeResponse, ResumeBatchResponse
from app.services.storage import get_storage
from app.tasks.parse_resume_task import parse_resume
from app.tasks.extract_zip_task import extract_zip

router = APIRouter()

@router.post("/jobs/{id}/resumes/upload", response_model=ResumeBatchResponse, status_code=202)
async def upload_resumes(
    id: int,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    job = db.query(Job).filter(Job.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    storage = get_storage()
    batch_id = str(uuid.uuid4())
    added = 0
    from app.core.config import settings
    
    for file in files:
        # File size check
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        
        if file.filename.endswith(".zip"):
            if size > settings.MAX_ZIP_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"Zip {file.filename} too large")
            storage_key = f"uploads/{id}/{batch_id}/{file.filename}"
            storage.upload(file.file, storage_key)
            # Background task for ZIP
            try:
                from app.tasks.extract_zip_task import extract_zip
                background_tasks.add_task(extract_zip, id, storage_key, batch_id)
            except Exception as e:
                print(f"Failed to queue zip task: {e}")
            added += 1
        elif file.filename.endswith(".pdf"):
            if size > settings.MAX_RESUME_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"Resume {file.filename} too large")
            storage_key = f"resumes/{id}/{uuid.uuid4()}/{file.filename}"
            storage.upload(file.file, storage_key)
            
            resume = Resume(
                job_id=id,
                original_filename=file.filename,
                storage_key=storage_key,
                upload_batch_id=batch_id,
                status="uploaded"
            )
            db.add(resume)
            db.commit()
            db.refresh(resume)
            
            # Native FastAPI Synchronous Background execution — guarantees pipeline completion
            def _sync_pipeline(resume_id, job_id):
                from app.db.session import SessionLocal as _SL
                from app.db.models.resume import Resume as _R, Candidate as _C
                from app.db.models.job import Job as _J
                from app.db.models.ats_score import AtsScore as _AS
                from app.services.resume_parser import extract_text_from_pdf as _ex, parse_resume_fields as _pf
                from app.services.ats_engine import calculate_ats_score as _calc
                _db = _SL()
                try:
                    _res = _db.query(_R).filter(_R.id == resume_id).first()
                    if not _res: return
                    _res.status = "parsing"
                    _db.commit()
                    print(f"[Logging: Parse Stage] Starting extraction for Resume ID {resume_id}")
                    _fp = os.path.join(settings.STORAGE_LOCAL_PATH, _res.storage_key)
                    try:
                        _text = _ex(_fp)
                        _fields = _pf(_text)
                        # Upsert
                        _cand = _db.query(_C).filter(_C.resume_id == resume_id).first()
                        if not _cand:
                            _cand = _C(resume_id=resume_id, job_id=job_id)
                            _db.add(_cand)
                        _cand.parsed_text = _text
                        for k in ["name","email","phone","skills","education","experience_years","current_company","previous_companies","projects","cgpa","certifications","location","notice_period_days"]:
                            val = _fields.get(k)
                            if k == "education" and isinstance(val, list):
                                from app.services.education_normalizer import normalize_education_value
                                for item in val:
                                    if isinstance(item, dict) and "degree" in item:
                                        item["degree"] = normalize_education_value(item["degree"])
                            setattr(_cand, k, val)
                        _res.status = "scoring"
                        _db.commit()
                        _db.refresh(_cand)
                        
                        # Score
                        print(f"[Logging: Score Stage] Calculating ATS Score for Candidate {_cand.id}")
                        _job = _db.query(_J).filter(_J.id == job_id).first()
                        if _job and _job.jd_text:
                            _result = _calc(_job.jd_text, _cand.parsed_text or "", _job.ats_keywords or [],
                                {"skills": _cand.skills, "experience_years": _cand.experience_years,
                                 "education": _cand.education, "certifications": _cand.certifications})
                            _score = _db.query(_AS).filter(_AS.candidate_id == _cand.id).first()
                            if not _score:
                                _score = _AS(candidate_id=_cand.id, job_id=job_id)
                                _db.add(_score)
                            _score.score = _result["score"]
                            _score.matched_keywords = _result["matched_keywords"]
                            _score.missing_keywords = _result["missing_keywords"]
                            _score.explanation = _result["explanation"]
                            
                            # --- Company Compatibility Scoring ---
                            from app.db.models.company_analysis import CompanyAnalysis
                            from app.services.company_analyzer import calculate_company_compatibility
                            if _job.company_context:
                                _comp_res = calculate_company_compatibility(_job.company_context, {
                                    "skills": _cand.skills, "experience_years": _cand.experience_years,
                                    "education": _cand.education, "certifications": _cand.certifications
                                }, _cand.parsed_text)
                                _comp_rec = _db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == _cand.id).first()
                                if not _comp_rec:
                                    _comp_rec = CompanyAnalysis(candidate_id=_cand.id, job_id=job_id)
                                    _db.add(_comp_rec)
                                _comp_rec.company_context = str(_job.company_context)
                                _comp_rec.fit_score = _comp_res.get("fit_score", 0.0)
                                _comp_rec.rationale = _comp_res.get("rationale", "")
                            
                            _res.status = "parsed"
                            _db.commit()
                            print(f"[Logging: Save Stage] Saving final ATS Score ({_result['score']}%) for Candidate {_cand.id}")
                    except Exception as pe:
                        _res.status = "failed"
                        _res.error_reason = str(pe)
                        _db.commit()
                        print(f"Pipeline Failed resume {resume_id}: {pe}")
                finally:
                    _db.close()

            background_tasks.add_task(_sync_pipeline, resume.id, id)
            added += 1
            
    return {"message": "Upload accepted for processing", "batch_id": batch_id, "file_count": added}

@router.get("/jobs/{id}/resumes", response_model=List[ResumeResponse])
def get_job_resumes(
    id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    print(f"[Logging: Upload Stage] Fetching uploaded resumes for Job {id}")
    resumes = db.query(Resume).filter(Resume.job_id == id).offset(skip).limit(limit).all()
    results = []
    from app.db.models.resume import Candidate
    from app.db.models.ats_score import AtsScore
    from app.db.models.company_analysis import CompanyAnalysis
    for r in resumes:
        r_dict = {
            "id": r.id, "job_id": r.job_id, "original_filename": r.original_filename,
            "status": r.status, "error_reason": r.error_reason, "upload_batch_id": r.upload_batch_id,
            "uploaded_at": r.uploaded_at, "storage_key": r.storage_key, "score": None, "company_fit_score": None
        }
        candidate = db.query(Candidate).filter(Candidate.resume_id == r.id).first()
        if candidate:
            score = db.query(AtsScore).filter(AtsScore.candidate_id == candidate.id).first()
            if score:
                r_dict["score"] = score.score
            
            fit = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == candidate.id).first()
            if fit:
                r_dict["company_fit_score"] = fit.fit_score
        results.append(r_dict)
    return results

@router.get("/resumes/{id}/status", response_model=ResumeResponse)
def get_resume_status(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.get("/resumes/{id}/pdf")
def get_resume_pdf(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    from app.core.config import settings
    filepath = os.path.join(settings.STORAGE_LOCAL_PATH, resume.storage_key)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
        
    return FileResponse(
        filepath, 
        media_type="application/pdf", 
        filename=resume.original_filename,
        content_disposition_type="inline" # Allow inline preview
    )
