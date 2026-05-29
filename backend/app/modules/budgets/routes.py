from datetime import datetime
from fastapi import APIRouter
from sqlalchemy import select
from app.core.database import DBSession
from app.core.security import CurrentUserID
from .models import Budget
from .schemas import BudgetUpdate, BudgetResponse

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.put("/current", response_model=BudgetResponse)
async def set_current_budget(
    data: BudgetUpdate,
    db: DBSession,
    user_id: CurrentUserID,
):
    now = datetime.now()

    # Find or Create budget for current month
    stmt = select(Budget).where(
        Budget.user_id == user_id, Budget.month == now.month, Budget.year == now.year
    )
    result = await db.execute(stmt)
    budget = result.scalar_one_or_none()

    if budget:
        budget.amount = data.amount
        # Reset notification flag if budget is increased
        budget.notified_80 = False
    else:
        budget = Budget(
            user_id=user_id, amount=data.amount, month=now.month, year=now.year
        )
        db.add(budget)

    await db.commit()
    await db.refresh(budget)

    # Calculate first day of next month for the "Reset Date"
    if now.month == 12:
        reset_date = datetime(now.year + 1, 1, 1)
    else:
        reset_date = datetime(now.year, now.month + 1, 1)

    return {
        "amount": budget.amount,
        "month": budget.month,
        "year": budget.year,
        "reset_date": reset_date,
    }
