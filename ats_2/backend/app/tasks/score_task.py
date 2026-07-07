from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.job import Job
from app.db.models.resume import Resume, Candidate
from app.db.models.ats_score import AtsScore
from app.services.ats_engine import calculate_ats_score

@celery_app.task(bind=True, max_retries=3)
def score_batch(self, job_id: int):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or not job.jd_text:
            return

        # Fetch candidates for this job whose resume is at "scoring" phase
        candidates = db.query(Candidate).join(Resume).filter(
            Candidate.job_id == job_id,
            Resume.status == "scoring"
        ).all()
        
        for candidate in candidates:
            # Only score if they don't have a score, or we intend to rescore.
            # Idempotent: upsert
            # Pass structured candidate info
            candidate_data = {
                "skills": candidate.skills,
                "experience_years": candidate.experience_years,
                "education": candidate.education,
                "certifications": candidate.certifications
            }
            
            print(f"[Logging: Score Stage] Calculating ATS Score for Candidate {candidate.id}")
            result = calculate_ats_score(
                jd_text=job.jd_text,
                resume_text=candidate.parsed_text or "",
                ats_keywords=job.ats_keywords or [],
                candidate_data=candidate_data
            )

            score_record = db.query(AtsScore).filter(AtsScore.candidate_id == candidate.id).first()
            if not score_record:
                score_record = AtsScore(candidate_id=candidate.id, job_id=job_id)
                db.add(score_record)
            
            score_record.score = result["score"]
            score_record.matched_keywords = result["matched_keywords"]
            score_record.missing_keywords = result["missing_keywords"]
            score_record.explanation = result["explanation"]
            
            # --- Company Compatibility Scoring ---
            from app.db.models.company_analysis import CompanyAnalysis
            from app.services.company_analyzer import calculate_company_compatibility
            
            if job.company_context:
                print(f"[Logging: Score Stage] Calculating Company Compatibility for Candidate {candidate.id}")
                comp_result = calculate_company_compatibility(job.company_context, candidate_data, candidate.parsed_text)
                
                comp_record = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == candidate.id).first()
                if not comp_record:
                    comp_record = CompanyAnalysis(candidate_id=candidate.id, job_id=job_id)
                    db.add(comp_record)
                    
                comp_record.company_context = str(job.company_context)
                comp_record.fit_score = comp_result.get("fit_score", 0.0)
                comp_record.rationale = comp_result.get("rationale", "")
            
            # Final pipeline stage for this resume
            resume = db.query(Resume).filter(Resume.id == candidate.resume_id).first()
            if resume:
                resume.status = "parsed"
                
            print(f"[Logging: Save Stage] Saving final ATS Score ({result['score']}%) for Candidate {candidate.id}")
            
        db.commit()
    except Exception as e:
        db.rollback()
        try:
            self.retry(exc=e, countdown=2 ** self.request.retries)
        except self.MaxRetriesExceededError:
            print(f"[Logging: System] Score batch max retries exceeded for job {job_id}")
            # Could update candidate statuses here, but job batches are independent
            pass
    finally:
        db.close()
