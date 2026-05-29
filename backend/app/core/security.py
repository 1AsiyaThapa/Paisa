from datetime import datetime, timedelta, timezone
from typing import Annotated

import httpx
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, Request, status
from jose import JWTError, jwt

from app.core.config import settings

# Password Hashing Configuration
ph = PasswordHasher()


def hash_password(password: str) -> str:
    """Hash a password using Argon2"""
    return ph.hash(password)


def verify_password(plain: str, hashed: str | None) -> bool:
    """Verify a password against a hash"""
    if not hashed:
        return False
    try:
        return ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


# JWT Handling
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a new JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> str:
    """Decode a JWT token and return the user ID"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


def get_current_user_id(request: Request, auth_token: str | None = Cookie(None)) -> str:
    """FastAPI dependency to get the current user ID from cookie or Bearer token"""
    # Try Bearer token from Authorization header first (for cross-domain requests)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        return decode_token(token)

    # Fall back to cookie
    if auth_token:
        return decode_token(auth_token)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )


CurrentUserID = Annotated[str, Depends(get_current_user_id)]


# Google Auth Helper
async def verify_google_token(token: str, client: httpx.AsyncClient) -> dict:
    """Verify Google OAuth token"""
    try:
        response = await client.get(
            f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={token}"
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token",
            )

        return response.json()
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google token",
        )
