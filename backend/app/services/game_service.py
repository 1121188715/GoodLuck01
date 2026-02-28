"""对局、掷骰子、移动、效果编排"""
import json
import random
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Board, Cell, GameSession
from app.services.cell_effect import apply_cell_effect, EffectResult
from app.services.cell_content_service import generate_cell_content


async def list_boards(session: AsyncSession):
    result = await session.execute(select(Board).order_by(Board.id))
    return result.scalars().all()


async def get_board_with_cells(session: AsyncSession, board_id: int) -> Board | None:
    result = await session.execute(
        select(Board).where(Board.id == board_id).options(selectinload(Board.cells))
    )
    board = result.scalar_one_or_none()
    if not board:
        return None
    board.cells.sort(key=lambda c: c.position)
    return board


async def create_game(
    session: AsyncSession,
    board_id: int,
    user_id: int | None = None,
    cell_count: int | None = None,
    difficulty: str | None = None,
) -> GameSession | None:
    if cell_count is None or cell_count <= 0:
        cell_count = 20
    if cell_count and cell_count > 0:
        # 动态创建棋盘与格子
        board = Board(name=f"自定义棋盘 {cell_count}", cell_count=cell_count)
        session.add(board)
        await session.flush()

        total = cell_count
        inner_positions = list(range(1, max(1, total - 1)))  # 排除起点和终点
        random.shuffle(inner_positions)
        idx = 0
        n_advance = min(max(1, total // 10), len(inner_positions))
        advance_positions = set(inner_positions[idx : idx + n_advance])
        idx += n_advance
        n_retreat = min(max(1, total // 12), max(0, len(inner_positions) - idx))
        retreat_positions = set(inner_positions[idx : idx + n_retreat])
        idx += n_retreat
        # 翻倍格：总格数的 1/20，随机布置；预留 2 个位置给退回起点、直达终点
        remaining = max(0, len(inner_positions) - idx - 2)
        n_double = min(max(1, total // 20), remaining) if remaining > 0 else 0
        double_positions = set(inner_positions[idx : idx + n_double]) if n_double > 0 else set()
        idx += n_double
        back_to_start_pos = inner_positions[idx] if idx < len(inner_positions) else None
        idx += 1
        jump_to_end_pos = inner_positions[idx] if idx < len(inner_positions) else None

        for i in range(cell_count):
            cell_type = "normal"
            effect_param = None
            if i in double_positions:
                cell_type = "double_next"
            elif i in advance_positions:
                cell_type = "advance"
                steps = random.randint(1, 4)
                effect_param = json.dumps({"steps": steps}, ensure_ascii=False)
            elif i in retreat_positions:
                cell_type = "retreat"
                steps = random.randint(1, 3)
                effect_param = json.dumps({"steps": steps}, ensure_ascii=False)
            elif back_to_start_pos is not None and i == back_to_start_pos:
                cell_type = "back_to_start"
            elif jump_to_end_pos is not None and i == jump_to_end_pos:
                cell_type = "jump_to_end"

            session.add(
                Cell(
                    board_id=board.id,
                    position=i,
                    cell_type=cell_type,
                    effect_param=effect_param,
                    content_pool_id=None,
                )
            )
        await session.flush()
    else:
        board = await get_board_with_cells(session, board_id)
        if not board:
            return None

    game = GameSession(
        board_id=board.id,
        current_position=0,
        status="playing",
        user_id=user_id,
        content_seed=random.randint(0, 2**31 - 1),
        events=json.dumps(
            [{"type": "meta", "difficulty": difficulty}] if difficulty else []
        ),
    )
    session.add(game)
    await session.flush()
    await session.refresh(game)
    return game


def _get_difficulty(events_json: str | None) -> str | None:
    events = _parse_events(events_json)
    for ev in events:
        if isinstance(ev, dict) and ev.get("type") == "meta" and ev.get("difficulty"):
            return ev["difficulty"]
    return None


def _double_active(game: GameSession) -> bool:
    return getattr(game, "double_remaining_rolls", 0) > 0


async def _build_cells(
    session: AsyncSession,
    board,
    game: GameSession,
    difficulty: str | None,
    refresh_content: bool,
) -> list:
    """构建格子列表（含 display_text），用于 get_game 与 roll_dice"""
    mult = 2 if _double_active(game) else 1
    cells = []
    for c in board.cells:
        display_text: str | None = None
        if c.cell_type in ("advance", "retreat"):
            steps = 1
            if refresh_content:
                steps = random.randint(1, 4) if c.cell_type == "advance" else random.randint(1, 3)
                c.effect_param = json.dumps({"steps": steps}, ensure_ascii=False)
            elif c.effect_param:
                try:
                    param = json.loads(c.effect_param)
                    steps = int(param.get("steps", 1))
                except (TypeError, ValueError, json.JSONDecodeError):
                    steps = 1
            steps *= mult
            display_text = f"前进 {steps} 格" if c.cell_type == "advance" else f"后退 {steps} 格"
        elif c.cell_type == "back_to_start":
            display_text = "退回起点"
        elif c.cell_type == "jump_to_end":
            display_text = "直达终点"
        elif c.cell_type == "double_next":
            display_text = "下一次翻倍"
        elif c.cell_type == "show_text":
            display_text = "命运"
        else:
            # 用种子保证同局内普通格内容稳定，只有刷新时才改变
            seed = (game.id * 1000000 + getattr(game, "content_seed", 0) + c.position)
            rng = random.Random(seed)
            display_text = await generate_cell_content(
                session, difficulty, multiplier=mult, rng=rng
            )

        cells.append({
            "id": c.id,
            "position": c.position,
            "cell_type": c.cell_type,
            "effect_param": c.effect_param,
            "content_pool_id": c.content_pool_id,
            "display_text": display_text,
        })
    return cells


async def get_game(
    session: AsyncSession, game_id: int, refresh_content: bool = False
) -> dict | None:
    result = await session.execute(
        select(GameSession).where(GameSession.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game:
        return None
    board = await get_board_with_cells(session, game.board_id)
    if not board:
        return None
    if refresh_content:
        game.content_seed = random.randint(0, 2**31 - 1)
        await session.flush()
    difficulty = _get_difficulty(game.events)
    cells = await _build_cells(session, board, game, difficulty, refresh_content)
    return {
        "game_id": game.id,
        "board_id": game.board_id,
        "board_name": board.name,
        "current_position": game.current_position,
        "cell_count": board.cell_count,
        "status": game.status,
        "cells": cells,
        "recent_events": _parse_events(game.events),
        "double_remaining_rolls": getattr(game, "double_remaining_rolls", 0),
    }


def _parse_events(events_json: str | None) -> list:
    if not events_json:
        return []
    try:
        return json.loads(events_json)
    except (json.JSONDecodeError, TypeError):
        return []


def _append_event(events_json: str | None, record: dict) -> str:
    events = _parse_events(events_json)
    events.append(record)
    return json.dumps(events[-50:])  # 只保留最近 50 条


async def roll_dice(session: AsyncSession, game_id: int) -> dict | None:
    result = await session.execute(
        select(GameSession).where(GameSession.id == game_id)
    )
    game = result.scalar_one_or_none()
    if not game or game.status != "playing":
        return None
    board = await get_board_with_cells(session, game.board_id)
    if not board:
        return None
    max_pos = board.cell_count - 1
    if max_pos < 0:
        max_pos = 0

    dice = random.randint(1, 6)
    from_position = game.current_position
    to_position = min(from_position + dice, max_pos)
    game.current_position = to_position
    await session.flush()

    # 响应结构
    out = {
        "dice": dice,
        "from_position": from_position,
        "to_position": to_position,
        "final_position": to_position,
        "effect": None,
        "side_text": None,
        "message": None,
        "recent_events": None,
    }

    dr_before = getattr(game, "double_remaining_rolls", 0)

    # 到达的格子效果
    cell_at = next((c for c in board.cells if c.position == to_position), None)
    if cell_at:
        effect_result: EffectResult = await apply_cell_effect(
            session,
            cell_at.cell_type,
            cell_at.effect_param,
            cell_at.content_pool_id,
            to_position,
            max_pos,
        )
        if effect_result.activate_double:
            game.double_remaining_rolls = 2
            out["effect"] = {"type": "double_next", "message": effect_result.message}
            if effect_result.message:
                out["message"] = effect_result.message
            if effect_result.event_record:
                game.events = _append_event(game.events, effect_result.event_record)
        else:
            if effect_result.new_position is not None and effect_result.new_position != to_position:
                game.current_position = effect_result.new_position
                out["final_position"] = effect_result.new_position
                out["effect"] = {
                    "type": "advance" if effect_result.new_position > to_position else "retreat",
                    "steps": abs(effect_result.new_position - to_position),
                }
            if effect_result.side_text is not None:
                out["side_text"] = effect_result.side_text
            if effect_result.message:
                out["message"] = effect_result.message
            if effect_result.event_record:
                game.events = _append_event(game.events, effect_result.event_record)

    # 每轮掷骰结束后，翻倍剩余次数减一
    dr = getattr(game, "double_remaining_rolls", 0)
    if dr > 0:
        game.double_remaining_rolls = dr - 1

    # 是否到达终点
    if game.current_position >= max_pos:
        game.status = "finished"

    await session.flush()

    dr_after = getattr(game, "double_remaining_rolls", 0)
    # 仅当翻倍状态变化时才返回 cells（普通格不再触发整盘刷新）
    if dr_before != dr_after:
        difficulty = _get_difficulty(game.events)
        await session.refresh(game)
        out["cells"] = await _build_cells(session, board, game, difficulty, refresh_content=False)
    out["recent_events"] = _parse_events(game.events)
    out["status"] = game.status
    out["double_remaining_rolls"] = getattr(game, "double_remaining_rolls", 0)
    return out
