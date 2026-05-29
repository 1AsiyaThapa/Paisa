from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ResponseBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: str
    name: str
    picture: str | None = None


class UserResponse(UserBase, ResponseBase):
    id: str
    google_id: str | None = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime
    updated_at: datetime | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    password: str | None = None
    new_password: str | None = None
