from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.db import init_db
from app.api import boards, games, users, database


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from app.db import AsyncSessionLocal
    from app.models import (
        Board,
        Cell,
        ContentPool,
        ContentItem,
        Punishment,
        Reward,
        Challenge,
        PunishmentTool,
        PunishmentPosition,
        PunishmentPose,
        PunishmentExtra,
    )
    from sqlalchemy import select

    # 若无惩罚动作则插入 10 个健身动作
    async with AsyncSessionLocal() as session:
        r = await session.execute(select(Punishment).limit(1))
        if r.scalar_one_or_none() is None:
            for name in [
                "深蹲", "波比跳", "开合跳", "高抬腿", "平板支撑",
                "俯卧撑", "卷腹", "箭步蹲", "臀桥", "登山跑",
            ]:
                session.add(Punishment(name=name))
            await session.commit()

    # 若无棋盘则插入测试数据
    async with AsyncSessionLocal() as session:
        r = await session.execute(select(Board).limit(1))
        if r.scalar_one_or_none() is None:
            pool = ContentPool(name="命运", source="database")
            session.add(pool)
            await session.flush()
            for t in ["心想事成", "好运连连", "小惊喜", "再接再厉"]:
                session.add(ContentItem(pool_id=pool.id, text=t))
            board = Board(name="测试棋盘", cell_count=20)
            session.add(board)
            await session.flush()
            for i in range(20):
                cell_type = "normal"
                effect_param = None
                content_pool_id = None
                if i == 3 or i == 5 or i == 7:
                    cell_type = "double_next"
                elif i == 10:
                    cell_type = "advance"
                    effect_param = '{"steps": 2}'
                elif i == 14:
                    cell_type = "retreat"
                    effect_param = '{"steps": 1}'
                elif i == 15:
                    cell_type = "show_text"
                    content_pool_id = pool.id
                session.add(
                    Cell(
                        board_id=board.id,
                        position=i,
                        cell_type=cell_type,
                        effect_param=effect_param,
                        content_pool_id=content_pool_id,
                    )
                )
            await session.commit()
    yield
    # shutdown if needed


app = FastAPI(title="GoodLuck", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(boards.router)
app.include_router(games.router)
app.include_router(users.router)
app.include_router(database.router)


@app.get("/")
async def root():
    return {"message": "GoodLuck API", "docs": "/docs"}
