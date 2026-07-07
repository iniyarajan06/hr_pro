import os
import uuid
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.job import Job
from app.db.models.resume import Candidate
from app.db.models.ats_score import AtsScore
from app.db.models.company_analysis import CompanyAnalysis
from app.db.models.report import Report
from app.services.exporter import generate_csv, generate_xlsx, generate_pdf
from app.core.config import settings

@celery_app.task
def generate_export_task(job_id: int, user_id: int, format_type: str, classification: str = None):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        candidates = db.query(Candidate).filter(Candidate.job_id == job_id).all()
        data = []
        
        # Thresholds (logic matches CandidateRanking.jsx)
        # Note: In a production app, these should be retrieved from a settings table.
        ATS_THRESHOLD = 70
        FIT_THRESHOLD = 70

        for c in candidates:
            score_rec = db.query(AtsScore).filter(AtsScore.candidate_id == c.id).first()
            fit_rec = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == c.id).first()
            
            ats_score = score_rec.score if score_rec else 0.0
            fit_score = fit_rec.fit_score if fit_rec else 0.0
            
            # Determine Status
            status_label = "Rejected"
            if ats_score >= ATS_THRESHOLD and fit_score >= FIT_THRESHOLD:
                status_label = "Selected"
            elif (ats_score >= ATS_THRESHOLD - 10 and ats_score < ATS_THRESHOLD) or \
                 (fit_score >= FIT_THRESHOLD - 10 and fit_score < FIT_THRESHOLD):
                status_label = "Waitlisted"
            
            # Filtering
            if classification and classification.lower() != status_label.lower():
                continue

            # Education Formatting
            edu_str = "N/A"
            if c.education:
                if isinstance(c.education, list):
                    edu_parts = []
                    for e in c.education:
                        if isinstance(e, dict):
                            part = f"{e.get('degree','')} {e.get('institution','')}".strip()
                            if part: edu_parts.append(part)
                        else:
                            edu_parts.append(str(e))
                    edu_str = ", ".join(edu_parts) if edu_parts else "N/A"
                else:
                    edu_str = str(c.education)

            data.append({
                "name": c.name or "N/A",
                "email": c.email or "N/A",
                "score": f"{round(ats_score)}%",
                "fit_score": f"{round(fit_score)}%",
                "status": status_label,
                "skills": ", ".join(c.skills) if isinstance(c.skills, list) else (c.skills or "N/A"),
                "experience": f"{c.experience_years} yrs" if c.experience_years is not None else "N/A",
                "education": edu_str
            })
            
        data.sort(key=lambda x: x["score"], reverse=True)

        report_id = str(uuid.uuid4())
        class_suffix = f"_{classification}" if classification else ""
        filename = f"report_{job_id}{class_suffix}_{report_id}.{format_type}"
        storage_key = f"reports/{job_id}/{filename}"
        target_path = os.path.join(settings.STORAGE_LOCAL_PATH, storage_key)

        if format_type == "csv":
            generate_csv(data, target_path)
        elif format_type == "xlsx":
            generate_xlsx(data, target_path)
        elif format_type == "pdf":
            generate_pdf(data, target_path)
        else:
            return

        report = Report(
            job_id=job_id,
            generated_by=user_id,
            format=format_type,
            storage_key=storage_key
        )
        db.add(report)
        db.commit()

    finally:
        db.close()
