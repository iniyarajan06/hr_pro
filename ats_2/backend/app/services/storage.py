import os
import shutil
from typing import BinaryIO
from fastapi import UploadFile
from app.core.config import settings

def ensure_storage_dir():
    os.makedirs(settings.STORAGE_LOCAL_PATH, exist_ok=True)

class LocalStorage:
    def upload(self, file_obj: BinaryIO, storage_key: str):
        ensure_storage_dir()
        target_path = os.path.join(settings.STORAGE_LOCAL_PATH, storage_key)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "wb") as f:
            shutil.copyfileobj(file_obj, f)
            
    def get_signed_url(self, storage_key: str) -> str:
        # In a real S3 backend, this returns a presigned URL.
        # For local, we return a special download route path.
        # It relies on the API to authenticate before serving.
        return f"/resumes/download/{storage_key}"
        
    def delete(self, storage_key: str):
        target_path = os.path.join(settings.STORAGE_LOCAL_PATH, storage_key)
        if os.path.exists(target_path):
            os.remove(target_path)

def get_storage():
    if settings.STORAGE_BACKEND == "local":
        return LocalStorage()
    else:
        # Placeholder for S3 implementation
        return LocalStorage()
