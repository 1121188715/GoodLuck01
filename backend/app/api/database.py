"""数据库内容 CRUD API：惩罚动作、命运文本等"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.db import get_db
from app.models.game_content import Punishment
from app.models.content import ContentPool, ContentItem


router = APIRouter(prefix="/api/database", tags=["database"])


class PunishmentItem(BaseModel):
    id: Optional[int] = None
    name: str = ""
    description: Optional[str] = None
    weight: int = 1


class ContentItemOut(BaseModel):
    id: Optional[int] = None
    text: str = ""
    weight: float = 1.0


class ContentPoolOut(BaseModel):
    id: Optional[int] = None
    name: str = ""
    items: List[ContentItemOut] = []


class DatabaseContent(BaseModel):
    punishments: List[PunishmentItem] = []
    content_pools: List[ContentPoolOut] = []


@router.get("", response_model=dict)
async def get_database_content(session: AsyncSession = Depends(get_db)):
    """获取可编辑的数据库内容"""
    r = await session.execute(select(Punishment).order_by(Punishment.id))
    punishments = [
        {"id": p.id, "name": p.name, "description": p.description, "weight": p.weight or 1}
        for p in r.scalars().all()
    ]
    r = await session.execute(select(ContentPool).order_by(ContentPool.id))
    pools = r.scalars().all()
    content_pools = []
    for pool in pools:
        items_r = await session.execute(
            select(ContentItem).where(ContentItem.pool_id == pool.id).order_by(ContentItem.id)
        )
        items = [
            {"id": i.id, "text": i.text, "weight": i.weight or 1.0}
            for i in items_r.scalars().all()
        ]
        content_pools.append({"id": pool.id, "name": pool.name, "items": items})
    return {"data": {"punishments": punishments, "content_pools": content_pools}, "error": None}


@router.put("", response_model=dict)
async def save_database_content(
    body: DatabaseContent,
    session: AsyncSession = Depends(get_db),
):
    """保存数据库内容（全量更新）"""
    try:
        await _do_save(body, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"data": {"ok": True}, "error": None}


async def _do_save(body: DatabaseContent, session: AsyncSession):
    """执行保存逻辑"""
    # 惩罚表：按 id 更新或插入，删除不在列表中的
    r = await session.execute(select(Punishment))
    existing_ids = {p.id for p in r.scalars().all()}
    payload_ids = set()
    for item in body.punishments:
        if item.id and item.id in existing_ids:
            p = await session.get(Punishment, item.id)
            if p:
                p.name = item.name or "未命名"
                p.description = item.description
                p.weight = item.weight
                payload_ids.add(item.id)
        else:
            session.add(
                Punishment(name=item.name or "未命名", description=item.description, weight=item.weight)
            )
    for eid in existing_ids - payload_ids:
        p = await session.get(Punishment, eid)
        if p:
            await session.delete(p)

    # 内容池与命运文本
    pool_existing = {}
    r = await session.execute(select(ContentPool))
    for pool in r.scalars().all():
        pool_existing[pool.id] = pool
    item_existing = {}
    r = await session.execute(select(ContentItem))
    for i in r.scalars().all():
        item_existing[i.id] = i

    for pool_data in body.content_pools:
        pool_id = pool_data.id if pool_data.id and pool_data.id in pool_existing else None
        if pool_id:
            pool = pool_existing[pool_id]
            pool.name = pool_data.name or "未命名"
        else:
            pool = ContentPool(name=pool_data.name or "未命名", source="database")
            session.add(pool)
            await session.flush()

        existing_item_ids = set()
        r = await session.execute(select(ContentItem).where(ContentItem.pool_id == pool.id))
        for i in r.scalars().all():
            existing_item_ids.add(i.id)
        payload_item_ids = set()
        for item_data in pool_data.items:
            if item_data.id and item_data.id in item_existing and item_existing[item_data.id].pool_id == pool.id:
                item = item_existing[item_data.id]
                item.text = item_data.text or ""
                item.weight = item_data.weight or 1.0
                payload_item_ids.add(item_data.id)
            else:
                session.add(ContentItem(pool_id=pool.id, text=item_data.text or "", weight=item_data.weight or 1.0))
        for eid in existing_item_ids:
            if eid not in payload_item_ids:
                item = await session.get(ContentItem, eid)
                if item:
                    await session.delete(item)

    await session.flush()
