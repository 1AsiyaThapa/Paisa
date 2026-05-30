import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.database import DBSession
from app.core.security import CurrentUserID, hash_password, verify_password

from .models import User
from .schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    db: DBSession,
    user_id: CurrentUserID,
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: DBSession,
    user_id: CurrentUserID,
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    update_data = user_update.model_dump(exclude_unset=True)

    if "password" in update_data and "new_password" in update_data:
        if not user.password_hash or not verify_password(
            update_data["password"], user.password_hash
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )
        user.password_hash = hash_password(update_data["new_password"])

    # Remove fields that shouldn't be directly set on the model or have been handled
    update_data.pop("password", None)
    update_data.pop("new_password", None)

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    return user


@router.post("/me/picture", response_model=UserResponse)
async def upload_profile_picture(
    db: DBSession,
    user_id: CurrentUserID,
    file: UploadFile = File(...),
):
    """Upload and update user profile picture"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    upload_path = Path("uploads/profiles")
    upload_path.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename or "").suffix or ".jpg"
    file_name = f"{uuid.uuid4()}{file_ext}"
    full_path = upload_path / file_name

    image_data = await file.read()
    if not image_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    with full_path.open("wb") as buffer:
        buffer.write(image_data)

    user.picture = f"{settings.BACKEND_URL}/uploads/profiles/{file_name}"

    await db.commit()
    await db.refresh(user)

    return user
