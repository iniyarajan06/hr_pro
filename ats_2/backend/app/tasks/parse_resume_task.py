import os
from celery.exceptions import Ignore
from app.core.celery_app import celery_app
from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models.resume import Resume, Candidate
from app.services.resume_parser import extract_text_from_pdf, parse_resume_fields

@celery_app.task(bind=True, max_retries=3)
def parse_resume(self, resume_id: int):
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            return
        
        resume.status = "parsing"
        print(f"[Logging: Parse Stage] Starting extraction for Resume ID {resume_id}")
        db.commit()

        filepath = os.path.join(settings.STORAGE_LOCAL_PATH, resume.storage_key)
        
        try:
            text = extract_text_from_pdf(filepath)
            fields = parse_resume_fields(text)
            
            # Upsert Candidate to ensure idempotency
            candidate = db.query(Candidate).filter(Candidate.resume_id == resume.id).first()
            if not candidate:
                candidate = Candidate(resume_id=resume.id, job_id=resume.job_id)
                db.add(candidate)
            
            candidate.parsed_text = text
            for k in ["name", "email", "phone", "skills", "education", "experience_years", "current_company", "previous_companies", "projects", "cgpa", "certifications", "location", "notice_period_days"]:
                setattr(candidate, k, fields.get(k))
            
            resume.status = "scoring"
            db.commit()
            
            # Auto-trigger scoring for the job
            from app.tasks.score_task import score_batch
            score_batch.delay(resume.job_id)
            
        except ValueError as e:
            # Permanent failure
            resume.status = "failed"
            resume.error_reason = str(e)
            db.commit()
        except Exception as e:
            # Transient failure
            db.rollback()
            try:
                self.retry(exc=e, countdown=2 ** self.request.retries)
            except self.MaxRetriesExceededError:
                resume.status = "failed"
                resume.error_reason = "Max retries exceeded"
                db.commit()
    finally:
        db.close()
