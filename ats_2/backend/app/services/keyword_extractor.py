import json
from groq import Groq
from app.core.config import settings

def _get_client():
    return Groq(api_key=settings.GROQ_API_KEY)

def extract_keywords(jd_text: str) -> list[dict]:
    client = _get_client()
    prompt = f"""
You are an expert technical recruiter. Extract the most important skills, tools, and keywords from the following Job Description.
Return a valid JSON array of objects, where each object has a 'keyword' (string) and a 'weight' (integer between 1 and 5, where 5 is the most critical).

Job Description:
{jd_text}

Output ONLY the JSON array without any markdown formatting or explanation. Example: [{{"keyword": "Python", "weight": 5}}]
"""
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024,
    )
    
    content = response.choices[0].message.content.strip()
    # Handle potential markdown code blocks
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return []
