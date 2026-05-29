from pydantic import BaseModel
from app.modules.users.schemas import UserResponse


class SignupRequest(BaseModel):
    email: str
    name: str
    password: str
    picture: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class OTPRequest(BaseModel):
    email: str
    name: str


class OTPVerifyRequest(BaseModel):
    email: str
    name: str
    password: str
    otp_code: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp_code: str
    new_password: str
