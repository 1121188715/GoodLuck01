"""奖励、惩罚、挑战主表及惩罚嵌套子表（工具、位置、姿势、附加）"""
from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db import Base


class Reward(Base):
    """奖励表"""
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Integer, default=1)  # 加权随机


class Punishment(Base):
    """惩罚表（可关联工具、位置、姿势、附加）"""
    __tablename__ = "punishments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Integer, default=1)

    tool_id = Column(Integer, ForeignKey("punishment_tools.id"), nullable=True)
    position_id = Column(Integer, ForeignKey("punishment_positions.id"), nullable=True)
    pose_id = Column(Integer, ForeignKey("punishment_poses.id"), nullable=True)
    extra_id = Column(Integer, ForeignKey("punishment_extras.id"), nullable=True)

    tool = relationship("PunishmentTool", back_populates="punishments")
    position = relationship("PunishmentPosition", back_populates="punishments")
    pose = relationship("PunishmentPose", back_populates="punishments")
    extra = relationship("PunishmentExtra", back_populates="punishments")


class Challenge(Base):
    """挑战表"""
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Integer, default=1)


class PunishmentTool(Base):
    """惩罚-工具子表"""
    __tablename__ = "punishment_tools"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)

    punishments = relationship("Punishment", back_populates="tool")


class PunishmentPosition(Base):
    """惩罚-位置子表"""
    __tablename__ = "punishment_positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)

    punishments = relationship("Punishment", back_populates="position")


class PunishmentPose(Base):
    """惩罚-姿势子表"""
    __tablename__ = "punishment_poses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)

    punishments = relationship("Punishment", back_populates="pose")


class PunishmentExtra(Base):
    """惩罚-附加子表"""
    __tablename__ = "punishment_extras"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(64), nullable=False)

    punishments = relationship("Punishment", back_populates="extra")
