import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

SYNONYMS = {
    "node": "node.js",
    "js": "javascript",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "reactjs": "react"
}

def normalize_text_with_synonyms(text: str) -> str:
    text = text.lower()
    for k, v in SYNONYMS.items():
        text = re.sub(rf"\b{re.escape(k)}\b", v, text)
    return text

def calculate_ats_score(jd_text: str, resume_text: str, ats_keywords: list[dict], candidate_data: dict, weights: dict = None) -> dict:
    if not weights:
        weights = {"skills": 0.40, "experience": 0.25, "education": 0.15, "projects_certs": 0.10, "tfidf": 0.10}

    jd_norm = normalize_text_with_synonyms(jd_text or "")
    res_norm = normalize_text_with_synonyms(resume_text or "")
    
    # 1. TF-IDF + LSA Semantic Matching
    semantic_score = 0.0
    if jd_norm and res_norm:
        vectorizer = TfidfVectorizer(stop_words='english')
        try:
            tfidf_matrix = vectorizer.fit_transform([jd_norm, res_norm])
            svd = TruncatedSVD(n_components=1) # LSA Semantic Mapping
            svd_matrix = svd.fit_transform(tfidf_matrix)
            sim = cosine_similarity(svd_matrix[0:1], svd_matrix[1:2])[0][0]
            semantic_score = max(float(sim) * 100, 0.0)
            if semantic_score < 0.1: # Fallback to standard tf-idf
                sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                semantic_score = float(sim) * 100
        except ValueError:
            semantic_score = 0.0

    # 2. Section Scoring Defaults
    scores = {"skills": 0.0, "experience": 0.0, "education": 0.0, "projects_certs": 0.0, "tfidf": semantic_score}
    
    matched_kws = []
    missing_kws = []
    
    # Skills Math
    if ats_keywords:
        total_kw = 0
        earned_kw = 0
        for item in ats_keywords:
            kw = item.get("keyword", "")
            wt = item.get("weight", 1)
            total_kw += wt
            kw_norm = normalize_text_with_synonyms(kw.lower())
            
            # Check in resume matching
            found = False
            # Check parsed skills explicitly
            parsed_skills = candidate_data.get("skills")
            if parsed_skills:
                # parsed_skills can be list of dicts or list of strings
                if isinstance(parsed_skills, list) and len(parsed_skills) > 0:
                    if isinstance(parsed_skills[0], dict):
                        flat_skills = [s.get("name", "").lower() for s in parsed_skills]
                    else:
                        flat_skills = [str(s).lower() for s in parsed_skills]
                    for s in flat_skills:
                        if normalize_text_with_synonyms(s) == kw_norm or kw_norm in normalize_text_with_synonyms(s):
                            found = True
                            break
            
            if not found and re.search(rf"\b{re.escape(kw_norm)}\b", res_norm):
                found = True
                
            if found:
                matched_kws.append(kw)
                earned_kw += wt
            else:
                missing_kws.append(kw)
        
        if total_kw > 0:
            scores["skills"] = (earned_kw / total_kw) * 100

    # Experience Logic
    req_exp = 3 # fallback mock requirement, logic can be derived from JD
    cand_exp = candidate_data.get("experience_years") or 0
    scores["experience"] = min((cand_exp / req_exp) * 100, 100) if req_exp > 0 else 100 if cand_exp > 0 else 50
    
    # Education
    has_edu = candidate_data.get("education")
    scores["education"] = 100.0 if has_edu and len(has_edu) > 0 else 20.0
    
    # Certifications & Projects
    has_certs = candidate_data.get("certifications")
    scores["projects_certs"] = 100.0 if has_certs and len(has_certs) > 0 else 30.0
    
    # Combine Weighted Score
    final_score = 0.0
    for k, w in weights.items():
        final_score += scores[k] * w
        
    final_score = round(min(max(final_score, 0.0), 100.0), 2)
    
    explanation = "Enhanced ATS Breakdown:\n"
    explanation += f"- Skills ({weights['skills']*100}%): {round(scores['skills'],1)}/100\n"
    explanation += f"- Experience ({weights['experience']*100}%): {round(scores['experience'],1)}/100\n"
    explanation += f"- Education ({weights['education']*100}%): {round(scores['education'],1)}/100\n"
    explanation += f"- Projects/Certs ({weights['projects_certs']*100}%): {round(scores['projects_certs'],1)}/100\n"
    explanation += f"- LSA/Semantic ({weights['tfidf']*100}%): {round(scores['tfidf'],1)}/100\n"
    explanation += f"\nTotal Match: {final_score}%"

    return {
        "score": final_score,
        "matched_keywords": matched_kws,
        "missing_keywords": missing_kws,
        "explanation": explanation
    }
