from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.transactions.models import TransactionType

if TYPE_CHECKING:
    from app.modules.users.models import User


class Category(Base):
    __tablename__ = "categories"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, values_callable=lambda x: [e.value for e in x])
    )
    icon: Mapped[str] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(20))

    user: Mapped["User"] = relationship(back_populates="categories")
