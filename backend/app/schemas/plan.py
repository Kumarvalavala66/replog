from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.exercise import ExerciseResponse


class PlanExerciseCreate(BaseModel):
    exercise_id: int = Field(gt=0)
    position: int = Field(default=0, ge=0)
    target_sets: int = Field(default=3, ge=1, le=20)
    target_reps_min: int = Field(default=8, ge=1, le=100)
    target_reps_max: int = Field(default=12, ge=1, le=100)
    target_weight_kg: float | None = Field(default=None, ge=0, le=2000)

    @model_validator(mode="after")
    def validate_reps(self):
        if self.target_reps_min > self.target_reps_max:
            raise ValueError("Minimum reps cannot exceed maximum reps")
        return self


class PlanCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=3000)
    exercises: list[PlanExerciseCreate] = Field(default_factory=list, max_length=100)


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=3000)


class PlanExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    position: int
    target_sets: int
    target_reps_min: int
    target_reps_max: int
    target_weight_kg: float | None
    exercise: "ExerciseResponse"


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    description: str | None
    exercises: list[PlanExerciseResponse]
