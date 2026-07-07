"""
Re-parse ALL existing resumes through the enhanced AI parser.
Resets all candidates and re-extracts fields using Groq Llama-3.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.session import SessionLocal
from app.db.models.resume import Resume, Candidate
from app.db.models.job import Job
from app.db.models.ats_score import AtsScore
from app.services.resume_parser import extract_text_from_pdf, parse_resume_fields
from app.services.ats_engine import calculate_ats_score

ALL_FIELDS = ["name", "email", "phone", "skills", "education", "experience_years",
              "current_company", "previous_companies", "projects", "cgpa",
              "certifications", "location", "notice_period_days"]

db = SessionLocal()

try:
    # Step 1: Re-parse ALL resumes (even already parsed ones)
    all_resumes = db.query(Resume).all()
    print(f"[Re-Parse Stage] Found {len(all_resumes)} total resumes to re-parse\n")

    for resume in all_resumes:
        print(f"  Processing resume id={resume.id}: {resume.original_filename}")
        filepath = os.path.join(settings.STORAGE_LOCAL_PATH, resume.storage_key)

        if not os.path.exists(filepath):
            print(f"    -> File not found on disk: {filepath}")
            resume.status = "failed"
            resume.error_reason = "File missing from disk"
            db.commit()
            continue

        try:
            resume.status = "parsing"
            db.commit()

            text = extract_text_from_pdf(filepath)
            fields = parse_resume_fields(text)

            # Upsert candidate
            candidate = db.query(Candidate).filter(Candidate.resume_id == resume.id).first()
            if not candidate:
                candidate = Candidate(resume_id=resume.id, job_id=resume.job_id)
                db.add(candidate)

            candidate.parsed_text = text
            for k in ALL_FIELDS:
                setattr(candidate, k, fields.get(k))

            resume.status = "parsed"
            db.commit()
            db.refresh(candidate)
            print(f"    -> Name: {candidate.name}")
            print(f"    -> Email: {candidate.email}")
            print(f"    -> CGPA: {candidate.cgpa}")
            print(f"    -> Experience: {candidate.experience_years} yrs")
            print(f"    -> Education: {candidate.education}")
            print(f"    -> Skills: {candidate.skills}")
            print(f"    -> Current Company: {candidate.current_company}")
            print(f"    -> Projects: {candidate.projects}")
            print(f"    -> Certifications: {candidate.certifications}")
            print(f"    -> Location: {candidate.location}")
            print()

        except Exception as e:
            resume.status = "failed"
            resume.error_reason = str(e)
            db.commit()
            print(f"    -> Parse FAILED: {e}\n")

    # Step 2: Score all parsed candidates
    parsed_candidates = db.query(Candidate).join(
        Resume, Resume.id == Candidate.resume_id
    ).filter(Resume.status == "parsed").all()

    print(f"\n[Score Stage] Found {len(parsed_candidates)} candidates to score")

    job_cache = {}
    for candidate in parsed_candidates:
        if candidate.job_id not in job_cache:
            job_cache[candidate.job_id] = db.query(Job).filter(Job.id == candidate.job_id).first()
        job = job_cache[candidate.job_id]

        if not job or not job.jd_text:
            print(f"  Candidate id={candidate.id}: No JD text — skipping")
            continue

        candidate_data = {
            "skills": candidate.skills,
            "experience_years": candidate.experience_years,
            "education": candidate.education,
            "certifications": candidate.certifications,
        }

        result = calculate_ats_score(
            jd_text=job.jd_text,
            resume_text=candidate.parsed_text or "",
            ats_keywords=job.ats_keywords or [],
            candidate_data=candidate_data
        )

        # Upsert score
        score_record = db.query(AtsScore).filter(AtsScore.candidate_id == candidate.id).first()
        if not score_record:
            score_record = AtsScore(candidate_id=candidate.id, job_id=candidate.job_id)
            db.add(score_record)

        score_record.score = result["score"]
        score_record.matched_keywords = result["matched_keywords"]
        score_record.missing_keywords = result["missing_keywords"]
        score_record.explanation = result["explanation"]
        db.commit()
        print(f"  [Save] {candidate.name} -> ATS Score: {result['score']}%")

    # Step 3: Print ranking
    print(f"\n[Rank Stage] Final Rankings:")
    all_scores = db.query(AtsScore).order_by(AtsScore.score.desc()).all()
    for i, s in enumerate(all_scores, 1):
        cand = db.query(Candidate).filter(Candidate.id == s.candidate_id).first()
        print(f"  #{i} {cand.name if cand else '?'} -> {s.score}%")

    print("\nRe-parse pipeline complete!")

finally:
    db.close()
