from pydantic import BaseModel


class BoardListItem(BaseModel):
    id: int
    name: str
    cell_count: int

    class Config:
        from_attributes = True


class BoardOut(BoardListItem):
    pass
