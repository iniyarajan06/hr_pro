from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.core.config import settings
from app.db.models.user import User

router = APIRouter()

@router.get("/settings/groq-status")
def get_groq_status(current_user: User = Depends(deps.get_current_user)):
    # Returns masked groq key
    key = settings.GROQ_API_KEY
    masked = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "***"
    return {"status": "configured" if key and key != "your_groq_api_key_here" else "missing", "masked_key": masked}

@router.get("/settings/taxonomy")
def get_taxonomy(current_user: User = Depends(deps.get_current_user)):
    return {"skills": ["Python", "React", "Node.js", "SQL", "AWS", "Docker", "TypeScript"]}

@router.get("/settings/threshold-templates")
def get_threshold_templates(current_user: User = Depends(deps.get_current_user)):
    return [
        {"name": "Strict Developer", "rules": [{"field": "score", "op": ">=", "value": 75}, {"field": "experience_years", "op": ">=", "value": 3}], "logic": "AND"},
        {"name": "Junior Relaxed", "rules": [{"field": "score", "op": ">=", "value": 50}], "logic": "AND"}
    ]
