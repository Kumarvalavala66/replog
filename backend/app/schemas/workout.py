from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.exercise import ExerciseResponse


class WorkoutSetCreate(BaseModel):
    set_number: int = Field(ge=1, le=100)
    reps: int | None = Field(default=None, ge=0, le=1000)
    weight_kg: float | None = Field(default=None, ge=0, le=2000)
    completed: bool = False
    notes: str | None = Field(default=None, max_length=1000)


class WorkoutExerciseCreate(BaseModel):
    exercise_id: int = Field(gt=0)
    position: int = Field(default=0, ge=0)
    sets: list[WorkoutSetCreate] = Field(default_factory=list, max_length=100)


class WorkoutSessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    source: str = Field(default="live")
    plan_id: int | None = Field(default=None, gt=0)
    performed_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=3000)
    exercises: list[WorkoutExerciseCreate] = Field(
        default_factory=list, max_length=100
    )

    @model_validator(mode="after")
    def validate_session(self):
        if self.source not in ("live", "manual"):
            raise ValueError("source must be 'live' or 'manual'")
        if self.source == "manual" and self.performed_at is None:
            raise ValueError("Manual workouts require performed_at")
        if (
            self.started_at is not None
            and self.ended_at is not None
            and self.ended_at < self.started_at
        ):
            raise ValueError("ended_at cannot be before started_at")
        return self


class WorkoutSetUpdate(BaseModel):
    reps: int | None = Field(default=None, ge=0, le=1000)
    weight_kg: float | None = Field(default=None, ge=0, le=2000)
    completed: bool | None = None
    notes: str | None = Field(default=None, max_length=1000)


class WorkoutSessionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    status: str | None = None
    performed_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=3000)


class WorkoutSetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    set_number: int
    reps: int | None
    weight_kg: float | None
    completed: bool
    notes: str | None


class WorkoutExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    position: int
    exercise: ExerciseResponse
    sets: list[WorkoutSetResponse]


class WorkoutExercisePositionUpdate(BaseModel):
    position: int = Field(ge=0, le=100)


class WorkoutSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    plan_id: int | None
    title: str
    source: str
    status: str
    started_at: datetime | None
    performed_at: datetime
    ended_at: datetime | None
    notes: str | None
    exercises: list[WorkoutExerciseResponse]
