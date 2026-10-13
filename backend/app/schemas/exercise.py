from pydantic import BaseModel, ConfigDict, Field


class ExerciseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    muscle_group: str = Field(min_length=1, max_length=80)
    equipment: str = Field(default="None", max_length=80)
    instructions: str | None = Field(default=None, max_length=3000)


class ExerciseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    muscle_group: str | None = Field(
        default=None, min_length=1, max_length=80
    )
    equipment: str | None = Field(default=None, max_length=80)
    instructions: str | None = Field(default=None, max_length=3000)


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    name: str
    muscle_group: str
    equipment: str
    instructions: str | None
