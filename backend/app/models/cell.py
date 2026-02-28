from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db import Base


class Cell(Base):
    __tablename__ = "cells"

    id = Column(Integer, primary_key=True, autoincrement=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
    position = Column(Integer, nullable=False)  # 0-based index
    cell_type = Column(String(32), nullable=False, default="normal")  # normal, advance, retreat, show_text
    effect_param = Column(Text, nullable=True)  # JSON e.g. {"steps": 2}
    content_pool_id = Column(Integer, ForeignKey("content_pools.id"), nullable=True)

    board = relationship("Board", back_populates="cells")
