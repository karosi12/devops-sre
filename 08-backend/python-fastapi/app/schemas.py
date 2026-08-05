from pydantic import BaseModel
from datetime import datetime


# User schemas
class UserCreate(BaseModel):
    name: str


class UserResponse(BaseModel):
    id: int
    name: str
    created_time: datetime

    class Config:
        from_attributes = True


# Post schemas
class PostCreate(BaseModel):
    user_id: int
    content: str


class PostResponse(BaseModel):
    post_id: int
    content: str
    user_id: int
    created_time: datetime

    class Config:
        from_attributes = True
