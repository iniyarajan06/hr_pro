import zipfile
import os
import uuid
import tempfile
from fastapi import UploadFile
from app.db.session import SessionLocal
from app.db.models.resume import Resume
from app.services.storage import get_storage
from app.core.celery_app import celery_app
from app.tasks.parse_resume_task import parse_resume

@celery_app.task
def extract_zip(job_id: int, zip_storage_key: str, batch_id: str):
    db = SessionLocal()
    storage = get_storage()
    from app.core.config import settings
    
    zip_path = os.path.join(settings.STORAGE_LOCAL_PATH, zip_storage_key)
    if not os.path.exists(zip_path):
        db.close()
        return

    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # zip_bomb guard could go here
            entries = zip_ref.namelist()
            pdf_entries = [e for e in entries if e.lower().endswith(".pdf") and not e.startswith("__MACOSX")]
            
            for entry in pdf_entries:
                # Sanitize name
                safe_name = os.path.basename(entry)
                new_key = f"resumes/{job_id}/{uuid.uuid4()}/{safe_name}"
                
                with zip_ref.open(entry) as source, open(os.path.join(settings.STORAGE_LOCAL_PATH, new_key), "wb") as target:
                    # Actually storage should handle this, but for simplicity:
                    os.makedirs(os.path.dirname(os.path.join(settings.STORAGE_LOCAL_PATH, new_key)), exist_ok=True)
                    target.write(source.read())
                
                resume = Resume(
                    job_id=job_id,
                    original_filename=safe_name,
                    storage_key=new_key,
                    upload_batch_id=batch_id,
                    status="uploaded"
                )
                db.add(resume)
                db.commit()
                db.refresh(resume)
                
                # Kick off parse task
                parse_resume.delay(resume.id)
                
    finally:
        db.close()
        # Optionally delete zip_path here
        pass
