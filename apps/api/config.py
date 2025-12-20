import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vibeknowing.db")
    
    # Supabase/Render often provide 'postgres://' but SQLAlchemy needs 'postgresql://'
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        return self.DATABASE_URL

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    WORKER_URL: str = os.getenv("WORKER_URL", "http://localhost:8001/transcribe")

    # Email Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = os.getenv("EMAIL_ACCOUNT", "rkyeluru@gmail.com")
    SMTP_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "duvh rabw ywui plpi")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
