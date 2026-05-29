from .models import TransactionType
from datetime import datetime


def process_dashboard_summary(raw_data, months: int) -> list[dict]:
    """
    Process raw transaction data into a dashboard summary format.
    Aggregates income and expenses by category per month.
    """
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

    # Find the most recent N months present in the data
    unique_months = sorted(
        set((int(row.year), int(row.month)) for row in raw_data), reverse=True
    )[:months]
    unique_months.reverse()

    # Filter data to only include those months
    filtered_data = [
        row for row in raw_data if (int(row.year), int(row.month)) in unique_months
    ]

    summary = {}
    for row in filtered_data:
        year = int(row.year)
        month = int(row.month)
        month_key = f"{year}-{month:02d}"
        month_label = f"{month_names[month - 1]} {year}"

        if month_key not in summary:
            summary[month_key] = {"month": month_label, "Income": 0.0}

        if row.type == TransactionType.INCOME:
            current = summary[month_key].get("Income", 0.0)
            summary[month_key]["Income"] = current + float(row.total)
        else:
            summary[month_key][row.category] = float(row.total)

    result = []
    for month_key in sorted(summary.keys()):
        month_data = summary[month_key]
        result.append(month_data)

    return result


def calculate_next_due_date(
    original_date: datetime, frequency: str, last_handled: datetime | None
) -> datetime:
    """Calculate the next due date for a recurring expense"""
    from dateutil.relativedelta import relativedelta

    # Start from last_handled_date if available, otherwise from original_date
    base_date = last_handled if last_handled else original_date

    if frequency == "weekly":
        return base_date + relativedelta(weeks=1)
    elif frequency == "monthly":
        return base_date + relativedelta(months=1)
    elif frequency == "semi_annually":
        return base_date + relativedelta(months=6)
    elif frequency == "yearly":
        return base_date + relativedelta(years=1)

    return base_date


def should_show_recurring_expense(
    next_due_date: datetime, days_before: int = 3
) -> bool:
    """Check if a recurring expense should be shown (within days_before of due date)"""
    from datetime import timedelta

    now = datetime.now()
    alert_date = next_due_date - timedelta(days=days_before)

    # Show if current date is between alert_date and next_due_date (inclusive)
    return alert_date <= now <= next_due_date
