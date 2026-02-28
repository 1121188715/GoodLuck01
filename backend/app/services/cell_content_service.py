"""格子内容随机生成：奖励/惩罚/挑战 + 5 的倍数"""
import random
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.game_content import Reward, Punishment, Challenge


def _random_multiple_of_5(max_val: int = 100, min_val: int = 5, rng=None) -> int:
    """返回 min_val 到 max_val 之间的 5 的倍数（下限默认 5）"""
    rng = rng or random
    choices = list(range(min_val, max_val + 1, 5))
    if not choices:
        return min_val
    return rng.choice(choices)


async def get_random_punishment(session: AsyncSession, rng=None) -> str | None:
    result = await session.execute(select(Punishment))
    items = list(result.scalars().all())
    if not items:
        return None
    rng = rng or random
    p = rng.choice(items)
    return p.name


async def get_random_reward(session: AsyncSession) -> str | None:
    result = await session.execute(select(Reward))
    items = list(result.scalars().all())
    if not items:
        return None
    return random.choice(items).name


async def get_random_challenge(session: AsyncSession) -> str | None:
    result = await session.execute(select(Challenge))
    items = list(result.scalars().all())
    if not items:
        return None
    return random.choice(items).name


async def generate_cell_content(
    session: AsyncSession,
    difficulty: str | None = None,
    multiplier: int = 1,
    rng=None,
) -> str:
    """根据难度随机生成格子内容：惩罚动作 + 5 的倍数。

    难度（下限均为 5）：
    - easy:    5–50
    - hard:    5–100（默认）
    - hell:    5–200

    multiplier: 数字倍数（用于翻倍效果，默认 1）
    rng: 可选的随机实例，用于确定性输出（同局内保持稳定）
    """
    rng = rng or random
    name = await get_random_punishment(session, rng=rng)
    if not name:
        name = "休息"
    max_val = 100
    if difficulty == "easy":
        max_val = 50
    elif difficulty == "hell":
        max_val = 200
    num = _random_multiple_of_5(max_val, rng=rng) * multiplier
    return f"{name} {num}"
