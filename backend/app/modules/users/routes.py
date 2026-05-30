import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.database import DBSession
from app.core.security import CurrentUserID, hash_password, verify_password

from .models import User
from .schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


async def upload_to_supabase(file_data: bytes, file_name: str, content_type: str) -> str:
    """Upload a file to Supabase Storage and return the public URL"""
    url = f"{settings.SUPABASE_URL}/storage/v1/object/uploads/profiles/{file_name}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, content=file_data, headers=headers)
        if response.status_code not in (200, 201):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to Supabase Storage: {response.text}",
            )
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/uploads/profiles/{file_name}"


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
@router.post("/me/picture/", response_model=UserResponse)
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

    image_data = await file.read()
    if not image_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    file_ext = Path(file.filename or "").suffix or ".jpg"
    file_name = f"{uuid.uuid4()}{file_ext}"

    # Upload to Supabase Storage if configured, otherwise fall back to local disk
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        picture_url = await upload_to_supabase(image_data, file_name, file.content_type or "image/jpeg")
    else:
        upload_path = Path(settings.PROFILES_DIR)
        upload_path.mkdir(parents=True, exist_ok=True)
        full_path = upload_path / file_name
        with full_path.open("wb") as buffer:
            buffer.write(image_data)
        picture_url = f"{settings.BACKEND_URL}/uploads/profiles/{file_name}"

    user.picture = picture_url
    await db.commit()
    await db.refresh(user)

    return user
