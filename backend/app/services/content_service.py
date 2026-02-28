"""从文案池随机取一条；供 show_text 等格子使用"""
import random
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.content import ContentPool, ContentItem


async def get_random_content(session: AsyncSession, pool_id: int) -> str | None:
    result = await session.execute(
        select(ContentItem).where(ContentItem.pool_id == pool_id)
    )
    items = list(result.scalars().all())
    if not items:
        return None
    # 简单加权：weight 越大被选中概率越高
    total = sum(it.weight or 1.0 for it in items)
    r = random.uniform(0, total)
    for it in items:
        w = it.weight or 1.0
        if r <= w:
            return it.text
        r -= w
    return items[-1].text
