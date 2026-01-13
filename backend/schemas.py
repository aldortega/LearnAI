from datetime import date
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    last_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    birthdate: date
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class UserOut(BaseModel):
    id: str
    name: str
    last_name: str
    email: EmailStr
    username: str
    birthdate: date


class AuthResponse(BaseModel):
    user: UserOut
