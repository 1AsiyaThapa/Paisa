"""
Clears all user-data tables EXCEPT `users`. Login credentials are preserved.

Tables wiped: transactions, categories, budgets, email_otps.

Run from the backend directory:
    python clear_db.py
"""

import asyncio

from app.core.database import AsyncSessionLocal, Base, engine
from app.modules.auth.models import EmailOTP  # noqa: F401  (table import)
from app.modules.budgets.models import Budget
from app.modules.categories.models import Category
from app.modules.transactions.models import Transaction
from sqlalchemy import delete


async def clear_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Order matters if FKs are enforced: child tables before parents.
        # All of these reference users.id, so they go first; users itself is left alone.
        for model in (Transaction, Budget, Category):
            result = await session.execute(delete(model))
            print(f"Deleted {result.rowcount} rows from {model.__tablename__}")

        # email_otps may or may not have a FK; clear it via raw delete on the table
        try:
            from app.modules.auth.models import EmailOTP as _EmailOTP

            result = await session.execute(delete(_EmailOTP))
            print(f"Deleted {result.rowcount} rows from email_otps")
        except Exception as e:
            print(f"Skipped email_otps: {e}")

        await session.commit()
        print("Done. `users` table left untouched.")


if __name__ == "__main__":
    asyncio.run(clear_all())
