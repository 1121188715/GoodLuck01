from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from app.db import Base


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    current_position = Column(Integer, nullable=False, default=0)
    status = Column(String(32), nullable=False, default="playing")  # playing, finished
    user_id = Column(Integer, nullable=True)  # 预留
    events = Column(Text, nullable=True)  # JSON array of event records
    double_remaining_rolls = Column(Integer, nullable=False, default=0)  # 翻倍剩余次数
    content_seed = Column(Integer, nullable=False, default=0)  # 普通格内容种子，刷新时更新
    created_at = Column(DateTime(timezone=True), server_default=func.now())
