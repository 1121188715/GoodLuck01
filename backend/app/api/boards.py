from fastapi import APIRouter

router = APIRouter(prefix="/api/boards", tags=["boards"])


@router.get("", response_model=dict)
async def get_boards():
    """返回一个虚拟棋盘占位，实际棋盘由前端参数决定。"""
    data = [
        {
            "id": 1,
            "name": "自定义棋盘",
            "cell_count": 0,
        }
    ]
    return {"data": data, "error": None}
