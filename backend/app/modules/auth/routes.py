import secrets
import string
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select

from app.core.config import settings
from app.core.database import DBSession
from app.core.http_client import get_http_client
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_google_token,
    verify_password,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserResponse

from .email_service import send_otp_email, send_password_reset_email
from .helpers import authenticate_user_via_google
from .models import EmailOTP
from .schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    OTPRequest,
    OTPVerifyRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/google")
def google_login():
    google_auth_url = "https://accounts.google.com/o/oauth2/auth"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": f"{settings.BACKEND_URL}/auth/google/callback",
        "scope": "openid email profile",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = f"{google_auth_url}?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(
    code: str, db: DBSession, client: httpx.AsyncClient = Depends(get_http_client)
):
    """Handle Google OAuth callback"""
    try:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.BACKEND_URL}/auth/google/callback",
            },
        )

        if token_response.status_code != 200:
            error_url = f"{settings.FRONTEND_URL}/login?error=token_exchange_failed"
            return RedirectResponse(url=error_url)

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        user_response = await client.get(
            f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={access_token}"
        )

        if user_response.status_code != 200:
            error_url = f"{settings.FRONTEND_URL}/login?error=user_info_failed"
            return RedirectResponse(url=error_url)

        user_info = user_response.json()

        token_data = await authenticate_user_via_google(db, user_info)

        redirect_url = f"{settings.FRONTEND_URL}/dashboard"

        # Pass token via URL param so frontend can store it (cross-domain cookie workaround)
        redirect_url = f"{settings.FRONTEND_URL}/auth/callback?token={token_data.access_token}"
        response = RedirectResponse(url=redirect_url)
        return response

    except Exception:
        error_url = f"{settings.FRONTEND_URL}/login?error=auth_failed"
        return RedirectResponse(url=error_url)


@router.post("/google/token", response_model=TokenResponse)
async def google_token_auth(
    google_token: str,
    db: DBSession,
    client: httpx.AsyncClient = Depends(get_http_client),
):
    """Authenticate with Google token (for frontend use)"""
    user_info = await verify_google_token(google_token, client)
    return await authenticate_user_via_google(db, user_info)


@router.post("/request-otp")
async def request_otp(
    otp_request: OTPRequest,
    db: DBSession,
):
    """Request OTP for email verification before signup"""
    stmt = select(User).where(User.email == otp_request.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    # Generate OTP
    otp_code = "".join(secrets.choice(string.digits) for _ in range(6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    # Save OTP
    email_otp = EmailOTP(
        email=otp_request.email,
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(email_otp)
    await db.commit()

    email_sent = await send_otp_email(
        to_email=otp_request.email, otp_code=otp_code, name=otp_request.name
    )

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email. Please try again.",
        )

    return {"message": "OTP sent to your email", "email": otp_request.email}


@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    db: DBSession,
):
    """Request OTP for resetting forgotten password"""
    stmt = select(User).where(User.email == req.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return {"message": "If that email exists, a reset code has been sent."}

    otp_code = "".join(secrets.choice(string.digits) for _ in range(6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    email_otp = EmailOTP(
        email=req.email,
        otp_code=otp_code,
        expires_at=expires_at,
    )
    db.add(email_otp)
    await db.commit()

    await send_password_reset_email(
        to_email=req.email, otp_code=otp_code, name=user.name
    )

    return {"message": "If that email exists, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    db: DBSession,
):
    """Verify OTP and set new password"""
    stmt = (
        select(EmailOTP)
        .where(
            EmailOTP.email == req.email,
            EmailOTP.otp_code == req.otp_code,
            EmailOTP.expires_at > datetime.now(timezone.utc),
        )
        .order_by(EmailOTP.created_at.desc())
    )
    result = await db.execute(stmt)
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    user_stmt = select(User).where(User.email == req.email)
    user_result = await db.execute(user_stmt)
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = hash_password(req.new_password)

    del_stmt = delete(EmailOTP).where(EmailOTP.email == req.email)
    await db.execute(del_stmt)
    await db.commit()

    return {"message": "Password reset successfully. You can now log in."}


@router.post("/signup", response_model=TokenResponse)
async def signup_with_email(
    signup_data: OTPVerifyRequest,
    response: Response,
    db: DBSession,
):
    """Sign up with email and password after OTP verification"""
    # Verify OTP
    stmt = (
        select(EmailOTP)
        .where(
            EmailOTP.email == signup_data.email,
            EmailOTP.otp_code == signup_data.otp_code,
            EmailOTP.expires_at > datetime.now(timezone.utc),
        )
        .order_by(EmailOTP.created_at.desc())
    )
    result = await db.execute(stmt)
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Create User and clean up OTPs atomically
    new_user = User(
        email=signup_data.email,
        name=signup_data.name,
        password_hash=hash_password(signup_data.password),
    )

    # Clean up OTPs
    del_stmt = delete(EmailOTP).where(EmailOTP.email == signup_data.email)
    await db.execute(del_stmt)
    db.add(new_user)

    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(data={"sub": new_user.id})
    token_data = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )

    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=True,
        samesite="none",
    )
    return token_data


@router.post("/login", response_model=TokenResponse)
async def login_with_email(
    login_data: LoginRequest,
    response: Response,
    db: DBSession,
):
    """Login with email and password"""
    stmt = select(User).where(User.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if (
        not user
        or not user.password_hash
        or not verify_password(login_data.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if login_data.remember_me:
        # Increase expiration for remember me
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        cookie_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    else:
        access_token = create_access_token(data={"sub": user.id})
        cookie_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    token_data = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )

    response.set_cookie(
        key="auth_token",
        value=access_token,
        max_age=cookie_max_age,
        httponly=True,
        secure=True,
        samesite="none",
    )
    return token_data


@router.post("/logout")
def logout(response: Response):
    """Logout endpoint (clear cookie)"""
    response.delete_cookie(key="auth_token")
    return {"message": "Logged out successfully"}


@router.get("/status")
async def auth_status(request: Request, db: DBSession):
    """Check authentication status without throwing 401"""
    token = request.cookies.get("auth_token")
    if not token:
        return {"authenticated": False, "user": None}

    try:
        user_id = decode_token(token)

        if user_id:
            user = await db.get(User, user_id)
            if user:
                return {
                    "authenticated": True,
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "picture": user.picture,
                    },
                }

        return {"authenticated": False, "user": None}
    except Exception:
        return {"authenticated": False, "user": None}
