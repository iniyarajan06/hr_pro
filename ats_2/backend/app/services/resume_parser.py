import os
import pdfplumber

def extract_text_from_pdf(filepath: str) -> str:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
    
    text = ""
    # Attempt 1: PyMuPDF (fitz)
    try:
        import fitz
        with fitz.open(filepath) as pdf:
            for page in pdf:
                page_text = page.get_text("text")
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"PyMuPDF Extraction Failed: {e}")
        
    # Attempt 2: pdfplumber fallback
    if len(text.strip()) < 50:
        text = ""
        try:
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            raise ValueError(f"Failed to read PDF with pdfplumber fallback: {str(e)}")
            
    if not text.strip():
        raise ValueError("no extractable text")
        
    return text

def parse_resume_fields(text: str) -> dict:
    from app.core.config import settings
    import json
    import re
    
    # Simple regex fallback for email incase AI fails
    email_match = re.search(r'[\w\.-]+@[\w\.-]+', text)
    email = email_match.group(0) if email_match else None
    
    empty_res = {
        "name": None, "email": email, "phone": None, "skills": [],
        "education": [], "experience_years": None, "current_company": None,
        "previous_companies": [], "projects": [], "cgpa": None, "certifications": [],
        "location": None, "notice_period_days": None
    }
    
    if len(text.strip()) < 10:
        return empty_res

    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        prompt = f"""
        You are an expert ATS Resume Parsing Engine.
        Extract the following fields from the resume text below and return ONLY valid JSON matching this schema:
        {{
            "name": "Candidate Name",
            "email": "Email Address",
            "phone": "Phone Number",
            "cgpa": "float/string format (e.g. 8.5, 3.8/4.0, 85%)",
            "education": [{{"degree": "string", "institution": "string", "year": "string"}}],
            "experience_years": integer (Total years of work experience, round up or calculate from employment history. Ex: 3),
            "current_company": "string",
            "previous_companies": ["string"],
            "projects": ["string (titles or short descriptions)"],
            "skills": ["string (all technical/soft skills)"],
            "certifications": ["string"],
            "location": "string",
            "notice_period_days": integer (or null)
        }}

        Resume Text:
        {text[:4500]}
        
        Output MUST be pure JSON with no markdown wrapping.
        """
        
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
        )
        
        raw_output = response.choices[0].message.content.strip()
        # Clean potential markdown wrapping
        if raw_output.startswith("```json"):
            raw_output = raw_output[7:-3].strip()
        elif raw_output.startswith("```"):
            raw_output = raw_output[3:-3].strip()
            
        parsed = json.loads(raw_output)
        
        # Merge with regex fallbacks
        if not parsed.get("email"):
            parsed["email"] = email
            
        return parsed

    except Exception as e:
        print(f"AI Parse Failed: {e}")
        return empty_res
