"""数据库连接与建表"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import DATABASE_URL

# 兼容同步 SQLite URL（开发时若用 sync 驱动）
_db_url = DATABASE_URL
if _db_url.startswith("sqlite://") and "aiosqlite" not in _db_url:
    _db_url = _db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

engine = create_async_engine(_db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """创建所有表"""
    from app.models import board, cell, content, game_session, game_content  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # 为已有表添加新列（若不存在）
    for col_sql in [
        "ALTER TABLE game_sessions ADD COLUMN double_remaining_rolls INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE game_sessions ADD COLUMN content_seed INTEGER NOT NULL DEFAULT 0",
    ]:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(col_sql))
        except Exception:
            pass  # 列已存在时忽略


async def get_db():
    """依赖：获取异步会话"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
