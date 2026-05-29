from pydantic import BaseModel
from datetime import datetime


class BudgetUpdate(BaseModel):
    amount: float


class BudgetResponse(BaseModel):
    amount: float
    month: int
    year: int
    reset_date: datetime
