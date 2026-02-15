from pydantic import BaseModel


class CamelModel(BaseModel):
    model_config = {
        "alias_generator": lambda s: "".join(
            word.capitalize() if i > 0 else word for i, word in enumerate(s.split("_"))
        ),
        "populate_by_name": True,
    }


class SeasonBase(CamelModel):
    year: int
    name: str
    is_active: bool = False


class TokenData(CamelModel):
    sub: str
    id: int
    role: str
    username: str
    acronym: str


class DriverPosition(CamelModel):
    position: int
    driver_code: str


class RaceEvent(CamelModel):
    type: str
    description: str
