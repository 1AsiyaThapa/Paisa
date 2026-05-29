from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.modules.users.models import User
from app.modules.users.schemas import UserResponse

from .schemas import TokenResponse


async def authenticate_user_via_google(
    db: AsyncSession, user_info: dict
) -> TokenResponse:
    """
    Handle Google OAuth user authentication:
    1. Extract user info from Google response.
    2. Find existing user by email or create a new one.
    3. Update user profile if needed.
    4. Generate and return an access token.
    """
    email = user_info.get("email")
    google_id = user_info.get("id")
    name = user_info.get("name")
    picture = user_info.get("picture")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided by Google",
        )

    # Check if user exists
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # Update Google ID or picture if missing/changed
        if not user.google_id:
            user.google_id = google_id
        if picture and user.picture != picture:
            user.picture = picture
    else:
        # Create new user
        user = User(
            email=email,
            name=name or email.split("@")[0],
            google_id=google_id,
            picture=picture,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
