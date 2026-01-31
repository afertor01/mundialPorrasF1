from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    acronym: str

class UserLogin(BaseModel):
    identifier: str    
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    username: str
    role: str
    avatar: str | None = "default.png"

class AvatarSchema(BaseModel):
    id: int
    filename: str
    url: str # Calcularemos la URL completa para facilitar al front

    class Config:
        from_attributes = True
