from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, cast, Float
from app.api import deps
from app.db.models.job import Job
from app.db.models.resume import Resume, Candidate
from app.db.models.ats_score import AtsScore
from app.db.models.threshold import ThresholdResult
from collections import Counter

router = APIRouter()

@router.get("/dashboard/summary")
def get_dashboard_summary(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    total_jobs = db.query(Job).count()
    total_resumes = db.query(Resume).count()
    total_candidates = db.query(Candidate).count()
    avg_score = db.query(func.avg(AtsScore.score)).scalar() or 0
    top_candidate = db.query(Candidate).join(AtsScore).order_by(AtsScore.score.desc()).first()
    above_threshold = db.query(ThresholdResult).filter(ThresholdResult.passed == True).count()
    from app.db.models.company_analysis import CompanyAnalysis
    from app.db.models.candidate_classification import CandidateClassification
    avg_fit = db.query(func.avg(CompanyAnalysis.fit_score)).scalar() or 0

    selected = db.query(CandidateClassification).filter(CandidateClassification.classification_status == 'Selected').count()
    waitlisted = db.query(CandidateClassification).filter(CandidateClassification.classification_status == 'Waitlisted').count()
    rejected = db.query(CandidateClassification).filter(CandidateClassification.classification_status == 'Rejected').count()

    return {
        "total_jobs": total_jobs,
        "total_resumes": total_resumes,
        "total_candidates": total_candidates,
        "average_ats_score": round(float(avg_score), 2),
        "average_company_fit": round(float(avg_fit), 2),
        "top_candidate_name": top_candidate.name if top_candidate else "N/A",
        "candidates_above_threshold": above_threshold,
        "selected_candidates": selected,
        "waitlisted_candidates": waitlisted,
        "rejected_candidates": rejected
    }

@router.get("/dashboard/charts")
def get_dashboard_charts(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    # ATS Distribution
    scores = db.query(AtsScore.score).all()
    score_values = [s[0] for s in scores]
    ranges = [(0,20),(20,40),(40,60),(60,80),(80,100)]
    ats_dist = [{"range": f"{lo}-{hi}", "count": sum(1 for s in score_values if lo <= s < hi)} for lo, hi in ranges]

    # Skill Distribution
    candidates = db.query(Candidate).all()
    skill_counter = Counter()
    exp_buckets = {"0-2": 0, "3-5": 0, "6-10": 0, "10+": 0}
    edu_counter = Counter()
    education_categories = Counter()
    for c in candidates:
        if c.skills and isinstance(c.skills, list):
            for sk in c.skills:
                skill_counter[sk] += 1
        yrs = c.experience_years or 0
        if yrs <= 2: exp_buckets["0-2"] += 1
        elif yrs <= 5: exp_buckets["3-5"] += 1
        elif yrs <= 10: exp_buckets["6-10"] += 1
        else: exp_buckets["10+"] += 1
        if c.education and isinstance(c.education, list):
            from app.services.education_normalizer import normalize_education_value, get_education_category
            for ed in c.education:
                deg = ed.get("degree", "Other") if isinstance(ed, dict) else str(ed)
                norm_deg = normalize_education_value(deg)
                edu_counter[norm_deg] += 1
                
                cat = get_education_category(norm_deg)
                education_categories[cat] += 1

    top_skills = [{"name": k, "count": v} for k, v in skill_counter.most_common(10)]
    experience_distribution = [{"years": k, "count": v} for k, v in exp_buckets.items()]
    education_breakdown = [{"degree": k, "count": v} for k, v in edu_counter.most_common(12)]
    category_data = [{"name": k, "count": v} for k, v in education_categories.items()] if 'education_categories' in locals() else []

    # Upload trend (by date)
    uploads = db.query(
        func.date(Resume.uploaded_at).label("day"),
        func.count().label("cnt")
    ).group_by(func.date(Resume.uploaded_at)).order_by(func.date(Resume.uploaded_at)).all()
    upload_trend = [{"date": str(u.day), "count": u.cnt} for u in uploads]

    # Company Fit Distribution
    from app.db.models.company_analysis import CompanyAnalysis
    from app.db.models.candidate_classification import CandidateClassification
    fit_scores = db.query(CompanyAnalysis.fit_score).all()
    fit_values = [f[0] for f in fit_scores]
    fit_ranges = [(0,10), (11,20), (21,30), (31,40), (41,50), (51,60), (61,70), (71,80), (81,90), (91,100)]
    fit_dist = [{"range": f"{lo}-{hi}%", "count": sum(1 for s in fit_values if lo <= s <= hi)} for lo, hi in fit_ranges]

    return {
        "ats_distribution": ats_dist,
        "fit_distribution": fit_dist,
        "top_skills": top_skills,
        "experience_distribution": experience_distribution,
        "education_breakdown": education_breakdown,
        "education_categories": category_data,
        "upload_trend": upload_trend
    }
