from typing import cast

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import CursorResult, delete, select

from app.core.database import DBSession
from app.core.security import CurrentUserID
from app.modules.transactions.models import TransactionType

from .models import Category
from .schemas import CategoryCreate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryResponse])
async def get_categories(
    db: DBSession,
    user_id: CurrentUserID,
    type: TransactionType | None = None,
):
    stmt = select(Category).where(Category.user_id == user_id)
    if type:
        stmt = stmt.where(Category.type == type)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    db: DBSession,
    user_id: CurrentUserID,
):
    # Check existence
    exist_stmt = select(Category).where(
        Category.user_id == user_id,
        Category.name == category.name,
        Category.type == category.type,
    )
    existing = await db.execute(exist_stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category.name}' already exists for {category.type}",
        )

    new_category = Category(user_id=user_id, **category.model_dump())
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_update: CategoryCreate,
    db: DBSession,
    user_id: CurrentUserID,
):
    stmt = select(Category).where(
        Category.id == category_id, Category.user_id == user_id
    )
    result = await db.execute(stmt)
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    for key, value in category_update.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    db: DBSession,
    user_id: CurrentUserID,
):
    stmt = delete(Category).where(
        Category.id == category_id, Category.user_id == user_id
    )
    result = cast(CursorResult, await db.execute(stmt))
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )

    return {"message": "Category deleted successfully"}
