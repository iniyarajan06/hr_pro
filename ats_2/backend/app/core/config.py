from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama3-70b-8192"
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_PATH: str = "./storage"
    MAX_RESUME_SIZE_MB: int = 10
    MAX_ZIP_SIZE_MB: int = 100
    MAX_RESUMES_PER_ZIP: int = 200

    class Config:
        env_file = "../.env"
        extra = "ignore"

settings = Settings()
