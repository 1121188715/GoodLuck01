from pydantic import BaseModel
from typing import Optional


class CellOut(BaseModel):
    id: int
    position: int
    cell_type: str
    effect_param: Optional[str] = None
    content_pool_id: Optional[int] = None

    class Config:
        from_attributes = True
