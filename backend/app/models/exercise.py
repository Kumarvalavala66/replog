from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    muscle_group: Mapped[str] = mapped_column(String(80), nullable=False)
    equipment: Mapped[str] = mapped_column(String(80), default="None")
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    owner: Mapped["User | None"] = relationship(back_populates="exercises")
    plan_assignments: Mapped[list["PlanExercise"]] = relationship(
        back_populates="exercise"
    )
    workout_assignments: Mapped[list["WorkoutExercise"]] = relationship(
        back_populates="exercise"
    )
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="exercise"
    )
