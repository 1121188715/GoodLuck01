"""各 CellType 的效果实现；到达格子时根据 type + effect_param 计算新位置或侧边文案"""
import json
import random
from typing import Any
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.content_service import get_random_content


@dataclass
class EffectResult:
    """一次格子效果的结果"""
    new_position: int | None = None  # 若不为 None 则替换当前格后的位置（用于 advance/retreat）
    side_text: str | None = None
    message: str | None = None
    event_record: dict | None = None  # 用于 recent_events
    activate_double: bool = False  # 是否激活翻倍效果
    effect_type: str | None = None  # 特殊类型，如 "challenge" 需前端交互


async def apply_cell_effect(
    session: AsyncSession,
    cell_type: str,
    effect_param: str | None,
    content_pool_id: int | None,
    current_position: int,
    max_position: int,
    custom_fate_items: list | None = None,
) -> EffectResult:
    """根据格子类型和参数执行效果，返回新位置（若有）、侧边文案、事件记录。"""
    result = EffectResult(new_position=current_position)
    param = {}
    if effect_param:
        try:
            param = json.loads(effect_param)
        except (json.JSONDecodeError, TypeError):
            pass

    if cell_type == "normal":
        return result

    if cell_type == "advance":
        steps = int(param.get("steps", 1))
        result.new_position = min(current_position + steps, max_position)
        result.message = f"前进 {steps} 格！"
        result.event_record = {
            "position": current_position,
            "type": "advance",
            "steps": steps,
            "detail": result.message,
        }
        return result

    if cell_type == "retreat":
        steps = int(param.get("steps", 1))
        result.new_position = max(0, current_position - steps)
        result.message = f"后退 {steps} 格！"
        result.event_record = {
            "position": current_position,
            "type": "retreat",
            "steps": steps,
            "detail": result.message,
        }
        return result

    if cell_type == "back_to_start":
        result.new_position = 0
        result.message = "退回起点！"
        result.event_record = {
            "position": current_position,
            "type": "back_to_start",
            "detail": result.message,
        }
        return result

    if cell_type == "jump_to_end":
        result.new_position = max_position
        result.message = "直达终点！"
        result.event_record = {
            "position": current_position,
            "type": "jump_to_end",
            "detail": result.message,
        }
        return result

    if cell_type == "double_next":
        result.activate_double = True
        result.message = "下一次翻倍！接下来两次掷骰中，所有格子数字将翻倍。"
        result.event_record = {
            "position": current_position,
            "type": "double_next",
            "detail": result.message,
        }
        return result

    if cell_type == "show_text":
        if custom_fate_items and len(custom_fate_items) > 0:
            result.side_text = random.choice(custom_fate_items)
        elif content_pool_id:
            text = await get_random_content(session, content_pool_id)
            result.side_text = text or ""
        if result.side_text is not None:
            result.message = "触发命运格"
            result.event_record = {
                "position": current_position,
                "type": "show_text",
                "detail": result.message,
            }
        return result

    if cell_type == "challenge":
        result.effect_type = "challenge"
        result.message = "挑战格：请从1数到20，麦克风将录制你的语音。"
        result.event_record = {
            "position": current_position,
            "type": "challenge",
            "detail": "挑战格",
        }
        return result

    return result
