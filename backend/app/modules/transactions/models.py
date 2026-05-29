import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.users.models import User


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class RecurrenceFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    SEMI_ANNUALLY = "semi_annually"
    YEARLY = "yearly"


class Transaction(Base):
    __tablename__ = "transactions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, values_callable=lambda x: [e.value for e in x])
    )
    category: Mapped[str] = mapped_column(String(100))
    note: Mapped[str | None] = mapped_column(String(500))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    receipt_url: Mapped[str | None] = mapped_column(String(512))

    # Recurring expense fields
    frequency: Mapped[str | None] = mapped_column(
        Enum(
            RecurrenceFrequency,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
        ),
        nullable=True,
    )
    last_handled_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="transactions")
