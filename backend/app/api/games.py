from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.schemas.game import GameCreate, GameOut, GameRollResponse
from app.services.game_service import create_game, get_game, roll_dice

router = APIRouter(prefix="/api/games", tags=["games"])


@router.post("", response_model=dict)
async def post_create_game(body: GameCreate, session: AsyncSession = Depends(get_db)):
    game = await create_game(
        session,
        body.board_id,
        body.user_id,
        body.cell_count,
        body.difficulty,
        body.custom_punishments,
        body.custom_fate_items,
    )
    if not game:
        raise HTTPException(status_code=404, detail="Board not found")
    state = await get_game(session, game.id)
    return {"data": state, "error": None}


@router.get("/{game_id}", response_model=dict)
async def get_game_state(
    game_id: int,
    refresh_content: bool = False,
    session: AsyncSession = Depends(get_db),
):
    state = await get_game(session, game_id, refresh_content=refresh_content)
    if not state:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"data": state, "error": None}


@router.post("/{game_id}/roll", response_model=dict)
async def post_roll(game_id: int, session: AsyncSession = Depends(get_db)):
    result = await roll_dice(session, game_id)
    if not result:
        raise HTTPException(status_code=404, detail="Game not found or already finished")
    return {"data": result, "error": None}
