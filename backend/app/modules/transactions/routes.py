import csv
import io
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Literal, cast

import numpy as np
import pandas as pd
from anyio.to_thread import run_sync
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from sklearn.linear_model import LinearRegression
from sqlalchemy import CursorResult, delete, desc, extract, func, select

from app.core.config import settings
from app.core.constants import DEFAULT_CATEGORY
from app.core.database import DBSession
from app.core.security import CurrentUserID
from app.modules.auth.email_service import send_budget_alert
from app.modules.budgets.models import Budget
from app.modules.categories.models import Category

from .helpers import (
    calculate_next_due_date,
    process_dashboard_summary,
    should_show_recurring_expense,
)
from .models import Transaction, TransactionType
from .schemas import (
    IncomeExpenseComparisonResponse,
    IncomeExpenseDataPoint,
    MultiReceiptAnalysis,
    RecurringActionRequest,
    RecurringExpenseResponse,
    TransactionCreate,
    TransactionResponse,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


async def check_budget_notifications(
    user_id: str,
    db: DBSession,
    user_email: str,
    user_name: str,
):
    """Background task to check budget threshold and send notifications"""
    now = datetime.now()

    # 1. Get Budget for current month
    b_stmt = select(Budget).where(
        Budget.user_id == user_id, Budget.month == now.month, Budget.year == now.year
    )
    budget = (await db.execute(b_stmt)).scalar_one_or_none()

    if not budget or budget.amount <= 0 or budget.notified_80:
        return

    # 2. Get Spent this month
    s_stmt = select(func.sum(Transaction.amount)).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.EXPENSE,
        extract("month", Transaction.date) == now.month,
        extract("year", Transaction.date) == now.year,
    )
    spent = (await db.execute(s_stmt)).scalar() or 0

    # 3. Check threshold
    if float(spent) >= (float(budget.amount) * 0.8):
        await send_budget_alert(user_email, user_name, 80)
        budget.notified_80 = True
        await db.commit()


@router.post(
    "/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    data: TransactionCreate,
    db: DBSession,
    user_id: CurrentUserID,
    background_tasks: BackgroundTasks,
):
    transaction = Transaction(user_id=user_id, **data.model_dump())
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    # Trigger budget check in background for expense transactions
    if data.type == TransactionType.EXPENSE:
        # Get user info for notification
        from app.modules.users.models import User

        user_stmt = select(User).where(User.id == user_id)
        user_result = await db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if user:
            background_tasks.add_task(
                check_budget_notifications, user_id, db, user.email, user.name
            )

    return transaction


@router.get("/", response_model=list[TransactionResponse])
async def get_transactions(
    db: DBSession,
    user_id: CurrentUserID,
    type: TransactionType | None = Query(
        None, description="Filter by transaction type"
    ),
    category: str | None = Query(None, description="Filter by category name"),
    date_from: date | None = Query(None, description="Start date in YYYY-MM-DD"),
    date_to: date | None = Query(None, description="End date in YYYY-MM-DD"),
    month: int | None = Query(None, ge=1, le=12, description="Filter by month"),
    year: int | None = Query(None, ge=2000, le=2100, description="Filter by year"),
    search: str | None = Query(None, description="Search within transaction notes"),
    sort_by: Literal["date", "amount"] = Query(
        "date", description="Sort by date or amount"
    ),
    sort_order: Literal["asc", "desc"] = Query(
        "desc", description="Sort ascending or descending"
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    stmt = select(Transaction).where(Transaction.user_id == user_id)

    if type:
        stmt = stmt.where(Transaction.type == type)
    if category:
        stmt = stmt.where(Transaction.category == category)
    if date_from:
        stmt = stmt.where(Transaction.date >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(Transaction.date <= datetime.combine(date_to, time.max))
    if month:
        stmt = stmt.where(extract("month", Transaction.date) == month)
    if year:
        stmt = stmt.where(extract("year", Transaction.date) == year)
    if search:
        stmt = stmt.where(
            Transaction.note.is_not(None),
            Transaction.note.ilike(f"%{search.strip()}%"),
        )

    sort_column = Transaction.amount if sort_by == "amount" else Transaction.date
    stmt = (
        stmt.order_by(sort_column.asc() if sort_order == "asc" else sort_column.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/export")
async def export_transactions_csv(
    db: DBSession,
    user_id: CurrentUserID,
    type: TransactionType | None = Query(
        None, description="Filter by transaction type"
    ),
    time_range: Literal[
        "last_week", "last_month", "last_year", "all_time", "custom"
    ] = Query("all_time"),
    date_from: date | None = Query(None, description="Start date for custom range"),
    date_to: date | None = Query(None, description="End date for custom range"),
):
    """Export filtered transactions as a CSV file"""
    stmt = select(Transaction).where(Transaction.user_id == user_id)

    if type:
        stmt = stmt.where(Transaction.type == type)

    now = datetime.now()
    if time_range == "last_week":
        stmt = stmt.where(Transaction.date >= now - timedelta(days=7))
    elif time_range == "last_month":
        stmt = stmt.where(Transaction.date >= now - timedelta(days=30))
    elif time_range == "last_year":
        stmt = stmt.where(Transaction.date >= now - timedelta(days=365))
    elif time_range == "custom":
        if date_from:
            stmt = stmt.where(Transaction.date >= datetime.combine(date_from, time.min))
        if date_to:
            stmt = stmt.where(Transaction.date <= datetime.combine(date_to, time.max))

    stmt = stmt.order_by(Transaction.date.desc())
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Date", "Time", "Type", "Category", "Amount", "Note"])

    for tx in transactions:
        writer.writerow(
            [
                tx.date.strftime("%Y-%m-%d"),
                tx.date.strftime("%H:%M:%S"),
                tx.type.value.capitalize(),
                tx.category,
                float(tx.amount),
                tx.note or "",
            ]
        )

    output.seek(0)
    filename = f"Paisatrack_Report_{now.strftime('%Y%m%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: str,
    db: DBSession,
    user_id: CurrentUserID,
):
    stmt = delete(Transaction).where(
        Transaction.id == transaction_id, Transaction.user_id == user_id
    )
    result = cast(CursorResult, await db.execute(stmt))
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    return None


@router.get("/stats")
async def get_dashboard_stats(
    db: DBSession,
    user_id: CurrentUserID,
    days: int = Query(None, description="Filter by last N days (7, 30, or 90)"),
):
    now = datetime.now()

    # Build date filter if days parameter is provided
    date_filter = []
    if days:
        start_date = now - timedelta(days=days)
        date_filter = [Transaction.date >= start_date]

    # Total Income (filtered by days if provided)
    income_stmt = select(func.sum(Transaction.amount)).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.INCOME,
        *date_filter,
    )
    # Total Expense (filtered by days if provided)
    expense_stmt = select(func.sum(Transaction.amount)).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.EXPENSE,
        *date_filter,
    )

    total_income_res = await db.execute(income_stmt)
    total_expense_res = await db.execute(expense_stmt)

    total_income = total_income_res.scalar() or Decimal("0")
    total_expense = total_expense_res.scalar() or Decimal("0")

    # Monthly Specific Expense for Budget Calculation (always current month)
    monthly_expense_stmt = select(func.sum(Transaction.amount)).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.EXPENSE,
        extract("month", Transaction.date) == now.month,
        extract("year", Transaction.date) == now.year,
    )
    monthly_spent = (await db.execute(monthly_expense_stmt)).scalar() or 0

    # Get Current Budget
    budget_stmt = select(Budget).where(
        Budget.user_id == user_id, Budget.month == now.month, Budget.year == now.year
    )
    budget_res = await db.execute(budget_stmt)
    budget = budget_res.scalar_one_or_none()
    budget_amount = float(budget.amount) if budget else 0.0

    # Calculate Reset Date (1st of next month)
    if now.month == 12:
        reset_date = datetime(now.year + 1, 1, 1)
    else:
        reset_date = datetime(now.year, now.month + 1, 1)

    # Recent Transactions (limit 10, filtered by days if provided)
    recent_stmt = (
        select(Transaction)
        .where(Transaction.user_id == user_id, *date_filter)
        .order_by(Transaction.date.desc())
        .limit(10)
    )
    recent_res = await db.execute(recent_stmt)
    recent = recent_res.scalars().all()

    return {
        "total_income": float(total_income),
        "total_expenses": float(total_expense),
        "balance": float(total_income - total_expense),
        "monthly_budget": budget_amount,
        "monthly_spent": float(monthly_spent),
        "reset_date": reset_date,
        "recent_transactions": recent,
        "days_filter": days,
    }


@router.get(
    "/income-expense-comparison", response_model=IncomeExpenseComparisonResponse
)
async def get_income_expense_comparison(
    db: DBSession,
    user_id: CurrentUserID,
    months: int = Query(
        6, ge=1, le=12, description="Number of months to retrieve (1-12)"
    ),
):
    def get_stmt(tx_type: TransactionType):
        return (
            select(
                extract("year", Transaction.date).label("year"),
                extract("month", Transaction.date).label("month"),
                func.sum(Transaction.amount).label("total"),
            )
            .where(Transaction.user_id == user_id, Transaction.type == tx_type)
            .group_by(
                extract("year", Transaction.date), extract("month", Transaction.date)
            )
            .order_by(
                extract("year", Transaction.date).desc(),
                extract("month", Transaction.date).desc(),
            )
            .limit(months)
        )

    income_res = await db.execute(get_stmt(TransactionType.INCOME))
    expense_res = await db.execute(get_stmt(TransactionType.EXPENSE))

    income_data = income_res.all()
    expense_data = expense_res.all()

    income_dict = {
        (int(row.year), int(row.month)): float(row.total) for row in income_data
    }
    expense_dict = {
        (int(row.year), int(row.month)): float(row.total) for row in expense_data
    }

    all_months = sorted(
        set(list(income_dict.keys()) + list(expense_dict.keys())), reverse=True
    )[:months]
    all_months.reverse()

    result = []
    month_names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]

    for year, month in all_months:
        month_label = f"{month_names[month - 1]} {year}"
        result.append(
            IncomeExpenseDataPoint(
                month=month_label,
                income=income_dict.get((year, month), 0.0),
                expense=expense_dict.get((year, month), 0.0),
            )
        )

    return IncomeExpenseComparisonResponse(data=result)


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    db: DBSession,
    user_id: CurrentUserID,
    months: int = Query(
        6, ge=1, le=12, description="Number of months to retrieve (1-12)"
    ),
):
    stmt = (
        select(
            extract("year", Transaction.date).label("year"),
            extract("month", Transaction.date).label("month"),
            Transaction.category,
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .where(Transaction.user_id == user_id)
        .group_by(
            extract("year", Transaction.date),
            extract("month", Transaction.date),
            Transaction.category,
            Transaction.type,
        )
        .order_by(
            desc(extract("year", Transaction.date)),
            desc(extract("month", Transaction.date)),
        )
    )

    result_proxy = await db.execute(stmt)
    raw_data = result_proxy.all()

    result = process_dashboard_summary(raw_data, months)

    return {"data": result}


@router.get("/category-proportions")
async def get_category_proportions(
    db: DBSession,
    user_id: CurrentUserID,
    type: TransactionType = Query(..., description="Transaction type"),
):

    stmt = (
        select(Transaction.category, func.sum(Transaction.amount).label("total"))
        .where(Transaction.user_id == user_id, Transaction.type == type)
        .group_by(Transaction.category)
        .order_by(desc("total"))
    )

    result_proxy = await db.execute(stmt)
    raw_data = result_proxy.all()

    data = []
    for row in raw_data:
        data.append({"category": str(row.category), "total": float(row.total)})

    return {"data": data}


@router.post("/scan")
@router.post("/scan/")
async def scan_receipt(
    db: DBSession,
    user_id: CurrentUserID,
    file: UploadFile = File(...),
):
    if (
        not file.filename
        or not file.content_type
        or not file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image with a valid filename",
        )

    # 1. Save File
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)

    file_ext = Path(cast(str, file.filename)).suffix
    file_name = f"{uuid.uuid4()}{file_ext}"
    full_path = upload_path / file_name

    image_data = await file.read()
    with full_path.open("wb") as buffer:
        buffer.write(image_data)

    file_url = f"/uploads/receipts/{file_name}"

    # 2. Get User Categories for context
    stmt = select(Category.name).where(
        Category.user_id == user_id, Category.type == TransactionType.EXPENSE
    )
    result = await db.execute(stmt)
    cat_names = list(result.scalars().all())

    if DEFAULT_CATEGORY not in cat_names:
        cat_names.append(DEFAULT_CATEGORY)

    # 3. AI Analysis
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = f"""
    Analyze this receipt image and break it down into logical expense items based on their categories.

    Rules:
    1. Identify items on the receipt and group them by these categories: {cat_names}.
    2. If multiple items belong to the same category (e.g., Maggi and Milk both in 'Groceries'), you can group them into one line item.
    3. For each item/group, extract the specific amount.
    4. The sum of all items must equal the grand total on the receipt.
    5. Use '{DEFAULT_CATEGORY}' if an item doesn't fit anywhere else.
    6. Extract the transaction date.

    Return the data structured as a list of items, each with item_name, amount, category, and note.
    """

    try:
        image_part = types.Part.from_bytes(data=image_data, mime_type=file.content_type)

        def _generate_receipt_analysis():
            return client.models.generate_content(
                model=settings.GEMINI_MODEL_ID,
                contents=[image_part, prompt],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": MultiReceiptAnalysis.model_json_schema(),
                },
            )

        response = await run_sync(_generate_receipt_analysis)

        if not response.text:
            raise ValueError("Empty response from AI")

        analysis = MultiReceiptAnalysis.model_validate_json(response.text)
        return {
            "receipt_url": file_url,
            "date": analysis.date,
            "total_on_receipt": analysis.total_amount_on_receipt,
            "suggested_transactions": analysis.items,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan receipt: {str(e)}",
        )


@router.get("/recurring/upcoming", response_model=list[RecurringExpenseResponse])
async def get_upcoming_recurring_expenses(
    db: DBSession,
    user_id: CurrentUserID,
):
    """Get all upcoming recurring expenses that should be shown (within 3 days of due date)"""

    # Get all transactions with frequency set (recurring expenses only)
    stmt = select(Transaction).where(
        Transaction.user_id == user_id,
        Transaction.type == TransactionType.EXPENSE,
        Transaction.frequency.isnot(None),
    )

    result = await db.execute(stmt)
    recurring_transactions = result.scalars().all()

    upcoming = []
    for tx in recurring_transactions:
        # Calculate next due date
        next_due = calculate_next_due_date(tx.date, tx.frequency, tx.last_handled_date)

        # Check if it should be shown (within 3 days)
        if should_show_recurring_expense(next_due):
            upcoming.append(
                RecurringExpenseResponse(
                    id=tx.id,
                    amount=tx.amount,
                    category=tx.category,
                    note=tx.note,
                    frequency=tx.frequency,
                    next_due_date=next_due,
                    original_date=tx.date,
                )
            )

    return upcoming


@router.post("/recurring/{transaction_id}/action", status_code=status.HTTP_200_OK)
async def handle_recurring_action(
    transaction_id: str,
    action_data: RecurringActionRequest,
    db: DBSession,
    user_id: CurrentUserID,
):
    """Handle actions on recurring expenses: mark_done, skip_once, or turn_off"""

    # Get the transaction
    stmt = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
        Transaction.frequency.isnot(None),
    )
    result = await db.execute(stmt)
    transaction = result.scalar_one_or_none()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring transaction not found",
        )

    action = action_data.action

    if action == "mark_done":
        # Create a new transaction for this occurrence
        next_due = calculate_next_due_date(
            transaction.date, transaction.frequency, transaction.last_handled_date
        )

        new_transaction = Transaction(
            user_id=user_id,
            amount=transaction.amount,
            type=transaction.type,
            category=transaction.category,
            note=transaction.note,
            date=next_due,
            receipt_url=transaction.receipt_url,
            frequency=None,  # This is a completed instance, not recurring
            last_handled_date=None,
        )
        db.add(new_transaction)

        # Update last_handled_date on the parent recurring transaction
        transaction.last_handled_date = next_due

    elif action == "skip_once":
        # Just update last_handled_date to skip this occurrence
        next_due = calculate_next_due_date(
            transaction.date, transaction.frequency, transaction.last_handled_date
        )
        transaction.last_handled_date = next_due

    elif action == "turn_off":
        # Turn off recurrence by setting frequency to None
        transaction.frequency = None
        transaction.last_handled_date = None

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'mark_done', 'skip_once', or 'turn_off'",
        )

    await db.commit()

    return {
        "message": f"Action '{action}' completed successfully",
        "transaction_id": transaction_id,
    }


@router.get("/predict-expense")
async def predict_next_month_expense(db: DBSession, user_id: CurrentUserID):
    """
    Per-category Linear Regression expense predictor for the next calendar month.
    For each expense category the user has transacted in, fit a small linear model
    on monthly aggregates and predict next month's spend.
    """
    FESTIVAL_MONTHS = {10, 11}
    FEATURE_NAMES = [
        "month_of_year",
        "prev_1_expense",
        "prev_2_expense",
        "prev_3_expense",
        "num_transactions",
        "is_festival_month",
    ]
    MIN_MONTHS = 4

    stmt = (
        select(
            extract("year", Transaction.date).label("year"),
            extract("month", Transaction.date).label("month"),
            Transaction.category.label("category"),
            func.sum(Transaction.amount).label("total_expense"),
            func.count().label("num_transactions"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.type == TransactionType.EXPENSE,
        )
        .group_by(
            extract("year", Transaction.date),
            extract("month", Transaction.date),
            Transaction.category,
        )
        .order_by(extract("year", Transaction.date), extract("month", Transaction.date))
    )
    rows = (await db.execute(stmt)).all()

    if not rows:
        return {
            "status": "insufficient_data",
            "message": "No expense transactions yet. Add some expenses to enable predictions.",
            "categories": [],
            "total_predicted": 0,
        }

    full_df = pd.DataFrame(
        [
            {
                "year": int(r.year),
                "month": int(r.month),
                "category": r.category,
                "total_expense": float(r.total_expense),
                "num_transactions": int(r.num_transactions),
            }
            for r in rows
        ]
    )

    latest = full_df.sort_values(["year", "month"]).iloc[-1]
    last_year = int(latest["year"])
    last_month = int(latest["month"])
    next_month = last_month + 1 if last_month < 12 else 1
    next_year = last_year if last_month < 12 else last_year + 1

    month_names = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    target_month_label = f"{month_names[next_month]} {next_year}"

    category_predictions: list[dict] = []
    insufficient_categories: list[str] = []

    for cat, cat_df in full_df.groupby("category"):
        cat_df = cat_df.sort_values(["year", "month"]).reset_index(drop=True)

        if len(cat_df) < MIN_MONTHS:
            insufficient_categories.append(str(cat))
            continue

        cat_df["month_of_year"] = cat_df["month"]
        cat_df["prev_1_expense"] = cat_df["total_expense"].shift(1)
        cat_df["prev_2_expense"] = cat_df["total_expense"].shift(2)
        cat_df["prev_3_expense"] = cat_df["total_expense"].shift(3)
        cat_df["is_festival_month"] = cat_df["month"].apply(
            lambda m: 1 if m in FESTIVAL_MONTHS else 0
        )

        clean = cat_df.dropna().reset_index(drop=True)
        if len(clean) < 2:
            insufficient_categories.append(str(cat))
            continue

        X = clean[FEATURE_NAMES].values
        y = clean["total_expense"].values

        model = LinearRegression()
        model.fit(X, y)

        next_features = np.array(
            [[
                next_month,
                float(cat_df.iloc[-1]["total_expense"]),
                float(cat_df.iloc[-2]["total_expense"]),
                float(cat_df.iloc[-3]["total_expense"]),
                float(cat_df.iloc[-1]["num_transactions"]),
                1 if next_month in FESTIVAL_MONTHS else 0,
            ]]
        )

        predicted = float(max(0, model.predict(next_features)[0]))
        category_predictions.append(
            {"category": str(cat), "predicted_amount": round(predicted, 2)}
        )

    if not category_predictions:
        return {
            "status": "insufficient_data",
            "message": (
                f"Need at least {MIN_MONTHS} months of data per category for "
                "reliable predictions."
            ),
            "categories": [],
            "insufficient_categories": insufficient_categories,
            "total_predicted": 0,
        }

    category_predictions.sort(key=lambda x: x["predicted_amount"], reverse=True)
    total_predicted = round(
        sum(c["predicted_amount"] for c in category_predictions), 2
    )

    return {
        "status": "success",
        "target_month": target_month_label,
        "total_predicted": total_predicted,
        "categories": category_predictions,
        "insufficient_categories": insufficient_categories,
    }
