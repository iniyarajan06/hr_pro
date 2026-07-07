import json
from groq import Groq
from app.core.config import settings

def _get_client():
    return Groq(api_key=settings.GROQ_API_KEY)

def generate_jd(questionnaire: dict) -> str:
    client = _get_client()
    prompt = f"""
You are an expert technical recruiter. Based on the following questionnaire answers, draft a professional, narrative-style Job Description.

REQUIREMENTS:
1. Generate a continuous, recruiter-style narrative (paragraph-based) job description.
2. The output should resemble a real LinkedIn or company careers page posting.
3. Naturally weave in the Job Title, Role Summary, Responsibilities, Required Skills, Preferred Skills, Experience, Education, Employment Type, Location, Salary (if provided), and Additional Requirements into the paragraphs.
4. DO NOT use markdown headings (like "## Required Skills" or "## Experience").
5. DO NOT use bulleted lists or numbered lists unless completely unavoidable. Keep it flowing as natural prose.
6. DO NOT INCLUDE ANY 'Company Culture', 'About Us', 'Our Values', 'Work Environment', 'Mission', or 'Vision' details. Keep the narrative strictly focused on the candidate, the role, and the technical requirements.

Questionnaire:
{json.dumps(questionnaire, indent=2)}

Output JUST the text of the Job Description without extra conversation or introductory phrases.
"""
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=2048,
    )
    return response.choices[0].message.content
