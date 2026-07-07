from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.resume import Candidate
from app.db.models.company_analysis import CompanyAnalysis
from app.services.company_fit import generate_company_fit

@celery_app.task
def generate_company_analysis(job_id: int, company_context: str, candidate_ids: list[int]):
    db = SessionLocal()
    try:
        candidates = db.query(Candidate).filter(
            Candidate.id.in_(candidate_ids),
            Candidate.job_id == job_id
        ).all()
        
        for candidate in candidates:
            # check if exists
            analysis = db.query(CompanyAnalysis).filter(CompanyAnalysis.candidate_id == candidate.id).first()
            if not analysis:
                analysis = CompanyAnalysis(candidate_id=candidate.id, job_id=job_id, company_context=company_context, fit_score=0, rationale="")
                db.add(analysis)
            
            candidate_data = {
                "skills": candidate.skills,
                "projects": candidate.projects,
                "experience_years": candidate.experience_years,
                "certifications": candidate.certifications
            }
            result = generate_company_fit(company_context, candidate.parsed_text or "", candidate_data=candidate_data)
            analysis.company_context = company_context
            analysis.fit_score = result.get("fit_score", 0)
            analysis.rationale = result.get("rationale", "")
            
        db.commit()
    finally:
        db.close()
