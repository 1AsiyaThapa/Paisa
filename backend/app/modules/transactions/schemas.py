from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from .models import TransactionType, RecurrenceFrequency


class TransactionBase(BaseModel):
    amount: Decimal
    type: TransactionType
    category: str
    note: str | None = None
    date: datetime
    receipt_url: str | None = None
    frequency: RecurrenceFrequency | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    last_handled_date: datetime | None = None


class ReceiptItem(BaseModel):
    item_name: str = Field(
        description="The name of the item or group of items (e.g., 'Maggi & Toothpaste')"
    )
    amount: float = Field(
        description="The cost associated with this specific item or category group"
    )
    category: str = Field(description="The category that best fits this item")
    note: str | None = Field(
        default=None, description="Brief description of what is included in this amount"
    )


class MultiReceiptAnalysis(BaseModel):
    items: list[ReceiptItem] = Field(
        description="List of categorized expenses found in the receipt"
    )
    date: str = Field(description="The date of the transaction in YYYY-MM-DD format")
    total_amount_on_receipt: float = Field(
        description="The grand total shown on the receipt for verification"
    )


class IncomeExpenseDataPoint(BaseModel):
    month: str
    income: float
    expense: float


class IncomeExpenseComparisonResponse(BaseModel):
    data: list[IncomeExpenseDataPoint]


class RecurringExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    amount: Decimal
    category: str
    note: str | None
    frequency: RecurrenceFrequency
    next_due_date: datetime
    original_date: datetime


class RecurringActionRequest(BaseModel):
    action: str = Field(
        ..., description="Action to perform: 'mark_done', 'skip_once', or 'turn_off'"
    )
