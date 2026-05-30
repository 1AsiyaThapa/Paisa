import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from google.genai import errors
from sqlalchemy.exc import SQLAlchemyError

# Import models to ensure they are registered with Base
import app.modules.auth.models
import app.modules.budgets.models
import app.modules.categories.models
import app.modules.transactions.models
import app.modules.users.models
from app.core.config import settings
from app.core.database import Base, engine
from app.modules.auth.routes import router as auth_router
from app.modules.budgets.routes import router as budget_router
from app.modules.categories.routes import router as cat_router
from app.modules.chatbot.routes import router as chat_router
from app.modules.transactions.routes import router as tx_router
from app.modules.users.routes import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.PROFILES_DIR, exist_ok=True)

    # Create tables asynchronously
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialize shared HTTPX client
    async with httpx.AsyncClient() as client:
        app.state.http_client = client
        yield


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    # Log the full error on the server for debugging
    print(f"DATABASE ERROR: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "A database error occurred. Please try again later.",
            "error": "Internal Database Error",
        },
    )


@app.exception_handler(errors.APIError)
async def genai_exception_handler(request: Request, exc: errors.APIError):
    return JSONResponse(
        status_code=503,
        content={"detail": "AI Service unavailable", "error": str(exc)},
    )


# Support multiple comma-separated origins for CORS
allowed_origins = [origin.strip() for origin in settings.FRONTEND_URL.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_base = settings.UPLOAD_BASE_DIR
os.makedirs(upload_base, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_base), name="uploads")

app.include_router(auth_router)
app.include_router(budget_router)
app.include_router(users_router)
app.include_router(tx_router)
app.include_router(cat_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {"message": "Paisatrack API is running"}
