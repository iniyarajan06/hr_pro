import json
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_semantic_score(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf = vectorizer.fit_transform([text1.lower(), text2.lower()])
        score = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(score) * 100
    except Exception:
        return 0.0

def generate_company_fit(company_context: str, resume_text: str, candidate_data: dict = None) -> dict:
    """
    Calculates Company Fit Score using a deterministic formula:
    - Tech Stack Match: 35%
    - Domain Match: 25%
    - Skills Match: 20%
    - Project Match: 10%
    - Experience Match: 5%
    - Certification Match: 5%
    """
    if not candidate_data:
        candidate_data = {}
        
    # Attempt to parse company_context if it's a JSON string
    ctx = {}
    try:
        ctx = json.loads(company_context)
    except Exception:
        # Fallback: treat as raw text
        ctx = {"raw": company_context}

    # Extract components from context (structured or raw)
    comp_tech = " ".join(ctx.get("tech_stack", [])) if "tech_stack" in ctx else company_context
    comp_domain = f"{ctx.get('industry', '')} {ctx.get('domain', '')} {ctx.get('business_focus', '')}" if any(k in ctx for k in ["industry", "domain", "business_focus"]) else company_context
    comp_general = company_context

    # Extract components from candidate
    cand_skills = " ".join(candidate_data.get("skills", [])) if isinstance(candidate_data.get("skills"), list) else str(candidate_data.get("skills") or "")
    cand_projects = " ".join(candidate_data.get("projects", [])) if isinstance(candidate_data.get("projects"), list) else str(candidate_data.get("projects") or "")
    cand_certs = " ".join(candidate_data.get("certifications", [])) if isinstance(candidate_data.get("certifications"), list) else str(candidate_data.get("certifications") or "")
    cand_exp_years = candidate_data.get("experience_years") or 0
    
    # 1. Tech Stack Match (35%)
    tech_score = calculate_semantic_score(comp_tech, cand_skills + " " + resume_text)
    
    # 2. Domain / Industry Match (25%)
    domain_score = calculate_semantic_score(comp_domain, resume_text)
    
    # 3. Skills Match (20%)
    skills_score = calculate_semantic_score(comp_general, cand_skills)
    
    # 4. Project Relevance (10%)
    project_score = calculate_semantic_score(comp_general, cand_projects)
    if not cand_projects:
        project_score = 0.0
    
    # 5. Experience Relevance (5%)
    # Mock logic: assume 5 years as 100% for fit
    experience_score = min((cand_exp_years / 5.0) * 100, 100) if cand_exp_years > 0 else 20.0
    
    # 6. Certifications (5%)
    cert_score = 100.0 if cand_certs else 0.0

    # Weighted Calculation
    final_score = (
        (0.35 * tech_score) +
        (0.25 * domain_score) +
        (0.20 * skills_score) +
        (0.10 * project_score) +
        (0.05 * experience_score) +
        (0.05 * cert_score)
    )
    
    final_score = round(min(max(final_score, 0.0), 100.0), 2)
    
    rationale = f"Deterministic Company Fit Analysis:\n"
    rationale += f"- Tech Stack Match (35%): {round(tech_score, 1)}/100\n"
    rationale += f"- Domain Match (25%): {round(domain_score, 1)}/100\n"
    rationale += f"- Skills Match (20%): {round(skills_score, 1)}/100\n"
    rationale += f"- Project Relevance (10%): {round(project_score, 1)}/100\n"
    rationale += f"- Experience Relevance (5%): {round(experience_score, 1)}/100\n"
    rationale += f"- Certifications (5%): {round(cert_score, 1)}/100\n"
    rationale += f"\nTotal Match: {final_score}%"

    return {
        "fit_score": final_score,
        "rationale": rationale
    }
