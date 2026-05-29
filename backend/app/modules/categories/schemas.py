from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.modules.transactions.models import TransactionType


class ResponseBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    name: str
    type: TransactionType
    icon: str
    color: str | None = None


class CategoryResponse(ResponseBase):
    id: str
    name: str
    type: TransactionType
    icon: str
    color: str | None = None
    created_at: datetime
