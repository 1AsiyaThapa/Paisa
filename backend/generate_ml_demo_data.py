import asyncio
import random
from datetime import datetime
from decimal import Decimal

import numpy as np
from app.core.database import AsyncSessionLocal, Base, engine
from app.modules.categories.models import Category
from app.modules.transactions.models import Transaction, TransactionType
from app.modules.users.models import User
from dateutil.relativedelta import relativedelta
from sqlalchemy import delete, select

np.random.seed(42)
random.seed(42)

MONTHS_TO_GENERATE = 24
BASE_INCOME = 65000
FESTIVAL_MONTHS = {10, 11}

# Per-category profiles drive distinct time series so the per-category
# linear regression has a learnable signal.
CATEGORY_PROFILES = {
    "Groceries": {
        "base": 12000,
        "festival_mult": 1.15,
        "noise": 800,
        "inflation": 80,
        "icon": "shopping-cart",
        "color": "#10B981",
    },
    "Transport": {
        "base": 5000,
        "festival_mult": 1.05,
        "noise": 400,
        "inflation": 30,
        "icon": "car",
        "color": "#3B82F6",
    },
    "Utilities": {
        "base": 3500,
        "festival_mult": 1.00,
        "noise": 200,
        "inflation": 20,
        "icon": "zap",
        "color": "#F59E0B",
    },
    "Entertainment": {
        "base": 4000,
        "festival_mult": 1.60,
        "noise": 900,
        "inflation": 40,
        "icon": "film",
        "color": "#EC4899",
    },
    "Shopping": {
        "base": 6000,
        "festival_mult": 1.80,
        "noise": 1500,
        "inflation": 60,
        "icon": "shopping-bag",
        "color": "#8B5CF6",
    },
}

INCOME_CATEGORY_DEFS = [
    {"name": "Salary", "icon": "briefcase", "color": "#22C55E"},
    {"name": "Freelance", "icon": "laptop", "color": "#06B6D4"},
]


async def seed_yearly_data(email: str):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(select(User).where(User.email == email))
        ).scalar_one_or_none()
        if not user:
            print(f"User {email} not found! Please create an account first.")
            return

        await session.execute(
            delete(Transaction).where(
                Transaction.user_id == user.id,
                Transaction.note.like("Auto-generated%"),
            )
        )
        await session.flush()
        print("Cleared old auto-generated transactions.")

        # Ensure each seeded category exists in the user's Category table so
        # they show up in Settings. Skip names the user already has.
        existing_rows = (
            await session.execute(
                select(Category.name, Category.type).where(Category.user_id == user.id)
            )
        ).all()
        existing_names = {(r[0], r[1]) for r in existing_rows}

        for cat_name, prof in CATEGORY_PROFILES.items():
            if (cat_name, TransactionType.EXPENSE) in existing_names:
                continue
            session.add(
                Category(
                    user_id=user.id,
                    name=cat_name,
                    type=TransactionType.EXPENSE,
                    icon=prof["icon"],
                    color=prof["color"],
                )
            )

        for inc in INCOME_CATEGORY_DEFS:
            if (inc["name"], TransactionType.INCOME) in existing_names:
                continue
            session.add(
                Category(
                    user_id=user.id,
                    name=inc["name"],
                    type=TransactionType.INCOME,
                    icon=inc["icon"],
                    color=inc["color"],
                )
            )

        await session.flush()
        print("Ensured seeded categories exist in user's Category table.")

        now = datetime.now()
        prev_cat_expense = {
            cat: prof["base"] for cat, prof in CATEGORY_PROFILES.items()
        }

        print(
            f"Generating {MONTHS_TO_GENERATE} months of synthetic data for {email}..."
        )

        for i in range(MONTHS_TO_GENERATE, 0, -1):
            target_date = now - relativedelta(months=i)
            month = target_date.month
            months_elapsed = MONTHS_TO_GENERATE - i

            # --- INCOME ---
            salary = BASE_INCOME + np.random.normal(0, 2000)
            freelance = float(
                np.random.choice(
                    [0, 0, 8000, 12000, 5000], p=[0.3, 0.2, 0.2, 0.15, 0.15]
                )
            )

            session.add(
                Transaction(
                    user_id=user.id,
                    amount=Decimal(str(round(salary, 2))),
                    type=TransactionType.INCOME,
                    category="Salary",
                    date=target_date.replace(day=1),
                    note=f"Auto-generated for {target_date.strftime('%b %Y')}",
                )
            )

            if freelance > 0:
                session.add(
                    Transaction(
                        user_id=user.id,
                        amount=Decimal(str(round(freelance, 2))),
                        type=TransactionType.INCOME,
                        category="Freelance",
                        date=target_date.replace(day=random.randint(10, 25)),
                        note=f"Auto-generated for {target_date.strftime('%b %Y')}",
                    )
                )

            # --- EXPENSES per category ---
            for cat, prof in CATEGORY_PROFILES.items():
                trend = prof["base"] + prof["inflation"] * months_elapsed
                festival = (
                    trend * (prof["festival_mult"] - 1)
                    if month in FESTIVAL_MONTHS
                    else 0
                )
                autocorr = 0.25 * (prev_cat_expense[cat] - prof["base"])
                noise = np.random.normal(0, prof["noise"])

                monthly_total = trend + festival + autocorr + noise
                monthly_total = max(200.0, monthly_total)
                prev_cat_expense[cat] = monthly_total

                num_tx = random.randint(3, 6)
                # Split monthly_total into num_tx transactions with mild jitter
                shares = np.random.dirichlet(np.ones(num_tx)) * monthly_total
                for amount in shares:
                    amount = max(50.0, float(amount))
                    session.add(
                        Transaction(
                            user_id=user.id,
                            amount=Decimal(str(round(amount, 2))),
                            type=TransactionType.EXPENSE,
                            category=cat,
                            date=target_date.replace(day=random.randint(1, 28)),
                            note=f"Auto-generated for {target_date.strftime('%b %Y')}",
                        )
                    )

        await session.commit()
        print("ML Demo data generated successfully!")


if __name__ == "__main__":
    asyncio.run(seed_yearly_data("youremail@gmail.com"))
