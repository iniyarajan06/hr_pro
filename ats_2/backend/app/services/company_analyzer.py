import re
import requests
import json
from groq import Groq
from app.core.config import settings

def _get_client():
    return Groq(api_key=settings.GROQ_API_KEY)

def analyze_company_website(url: str) -> dict:
    try:
        # Standard headers to bypass basic bot blocks
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        # Clean URL if it doesn't have scheme
        if not url.startswith("http"):
            url = "https://" + url
            
        resp = requests.get(url, headers=headers, timeout=10)
        html = resp.text
        
        # Remove scripts, styles and HTML tags
        text = re.sub(r'<script.*?</script>', ' ', html, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'<style.*?</style>', ' ', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Limit text size for context window
        text = text[:15000]
        
        client = _get_client()
        prompt = f"""
You are an expert corporate strategist and analyst. Analyze the following company website text and extract its core context.
Return ONLY valid JSON matching this exact schema:
{{
    "industry": "string (e.g. Fintech, Healthcare, SaaS)",
    "domain": "string (Specific niche/domain)",
    "tech_stack": ["Array of any specific software/technologies mentioned"],
    "keywords": ["Array of business/marketing keywords representing them"],
    "culture_traits": ["Array of inferred culture values or mission keywords"],
    "business_focus": "string (Short summary of their main product/service offering)"
}}

Website Text:
{text}

Output MUST be pure JSON and nothing else.
"""
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
        )
        
        raw_output = response.choices[0].message.content.strip()
        if raw_output.startswith("```json"):
            raw_output = raw_output[7:-3].strip()
        elif raw_output.startswith("```"):
            raw_output = raw_output[3:-3].strip()
            
        return json.loads(raw_output)
        
    except Exception as e:
        print(f"Failed to analyze company {url}: {e}")
        return {
            "industry": "N/A",
            "domain": "N/A",
            "tech_stack": [],
            "keywords": [],
            "culture_traits": [],
            "business_focus": "Unable to extract"
        }

def calculate_company_compatibility(company_context: dict, candidate_data: dict, resume_text: str = "") -> dict:
    from app.services.company_fit import generate_company_fit
    
    # company_context is a dict here, so we convert it to JSON string for the service which handles both
    context_str = json.dumps(company_context)
    return generate_company_fit(context_str, resume_text, candidate_data=candidate_data)
