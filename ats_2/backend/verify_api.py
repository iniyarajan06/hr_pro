import requests
r = requests.get("http://localhost:8000/jobs/1/ranking")
data = r.json()
print(f"Total candidates: {len(data)}\n")
for i, c in enumerate(data):
    name = c.get("name") or "N/A"
    cgpa = c.get("cgpa") or "N/A"
    exp = c.get("experience_years")
    exp_str = f"{exp} yrs" if exp is not None else "N/A"
    company = c.get("current_company") or "N/A"
    skills = c.get("skills") or []
    score_obj = c.get("score")
    score_val = score_obj["score"] if score_obj else "N/A"
    edu_list = c.get("education") or []
    edu_str = ", ".join(
        e.get("degree", "") if isinstance(e, dict) else str(e)
        for e in edu_list
    ) if isinstance(edu_list, list) else str(edu_list)
    projects = c.get("projects") or []

    print(f"  #{i+1} {name}")
    print(f"     CGPA: {cgpa} | Exp: {exp_str} | Score: {score_val}%")
    print(f"     Education: {edu_str[:80]}")
    print(f"     Skills ({len(skills)}): {', '.join(skills[:6])}{'...' if len(skills)>6 else ''}")
    print(f"     Company: {company} | Projects: {len(projects)}")
    print()
