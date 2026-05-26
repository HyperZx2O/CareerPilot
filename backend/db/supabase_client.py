import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Load DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Local fallback SQLite database if Supabase environment variables are not yet set
    DATABASE_URL = "sqlite+aiosqlite:///careerpilot.db"
elif DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy requires 'postgresql+asyncpg://' instead of 'postgres://' for async execution
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# Configure SQLAlchemy Async Engine
_engine_kwargs: dict = {"echo": False}
if "sqlite" not in DATABASE_URL:
    _engine_kwargs.update(
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

engine = create_async_engine(DATABASE_URL, **_engine_kwargs)

# Configure Sessionmaker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Declarative base model
Base = declarative_base()

async def get_db():
    """
    FastAPI dependency yielding an async database session.
    Automatically commits transactions on success, or rolls back on exceptions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
