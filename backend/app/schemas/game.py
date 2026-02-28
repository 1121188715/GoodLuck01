from pydantic import BaseModel
from typing import Optional, Any, List


class GameCreate(BaseModel):
    board_id: int
    user_id: Optional[int] = None
    cell_count: Optional[int] = None
    difficulty: Optional[str] = None  # easy | hard | hell
    custom_punishments: Optional[List[str]] = None  # 本地自定义惩罚动作，优先级高于服务器
    custom_fate_items: Optional[List[str]] = None   # 本地自定义命运文本


class GameOut(BaseModel):
    game_id: int
    board_id: int
    board_name: str
    current_position: int
    cell_count: int
    status: str
    cells: List[Any]  # list of CellOut dicts


class GameRollResponse(BaseModel):
    dice: int
    from_position: int
    to_position: int
    final_position: int
    effect: Optional[Any] = None
    side_text: Optional[str] = None
    message: Optional[str] = None
    recent_events: Optional[List[Any]] = None
    status: Optional[str] = None  # playing | finished


class ChallengeResultRequest(BaseModel):
    success: bool  # 语音转文字是否满足「从1数到20」
