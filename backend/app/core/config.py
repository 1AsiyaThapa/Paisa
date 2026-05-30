import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Paisatrack API"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")

    GMAIL_USER: str = os.getenv("GMAIL_USER", "")
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL_ID: str = "gemini-2.5-flash"

    @property
    def UPLOAD_BASE_DIR(self) -> str:
        return "/tmp/uploads" if os.getenv("VERCEL") == "1" else "uploads"

    @property
    def UPLOAD_DIR(self) -> str:
        return f"{self.UPLOAD_BASE_DIR}/receipts"

    @property
    def PROFILES_DIR(self) -> str:
        return f"{self.UPLOAD_BASE_DIR}/profiles"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        # Support both PostgreSQL and MySQL connection strings
        url = self.DATABASE_URL
        if "postgresql" in url or "postgres" in url:
            # Replace postgresql:// or postgresql+psycopg2:// with postgresql+asyncpg://
            if "+asyncpg" not in url:
                url = url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
                url = url.replace("postgresql://", "postgresql+asyncpg://")
                url = url.replace("postgres://", "postgresql+asyncpg://")
            return url
        # MySQL fallback
        return url.replace("pymysql", "aiomysql")


settings = Settings()
