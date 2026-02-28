"""用户相关接口占位，为后续登录与模式选择预留"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=dict)
async def get_current_user():
    # 占位：未实现登录时返回匿名
    return {"data": {"id": None, "username": None}, "error": None}
