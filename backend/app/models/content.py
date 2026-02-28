from sqlalchemy import Column, Integer, String, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.db import Base


class ContentPool(Base):
    __tablename__ = "content_pools"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    source = Column(String(32), nullable=True, default="database")

    items = relationship("ContentItem", back_populates="pool")


class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pool_id = Column(Integer, ForeignKey("content_pools.id"), nullable=False)
    text = Column(Text, nullable=False)
    weight = Column(Float, nullable=True, default=1.0)  # for weighted random

    pool = relationship("ContentPool", back_populates="items")
