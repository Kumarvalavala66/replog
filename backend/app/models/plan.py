from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship(back_populates="plans")
    exercises: Mapped[list["PlanExercise"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="PlanExercise.position",
    )
    sessions: Mapped[list["WorkoutSession"]] = relationship(
        back_populates="plan"
    )


class PlanExercise(Base):
    __tablename__ = "plan_exercises"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False
    )
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_sets: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    target_reps_min: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    target_reps_max: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    target_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    plan: Mapped["WorkoutPlan"] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="plan_assignments")
