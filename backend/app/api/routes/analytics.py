from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DatabaseSession
from app.models.exercise import Exercise
from app.models.workout import WorkoutExercise, WorkoutSession, WorkoutSet

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
def get_summary(db: DatabaseSession, user: CurrentUser):
    completed_filter = (
        WorkoutSession.user_id == user.id,
        WorkoutSession.status == "completed",
    )

    total_workouts = db.scalar(
        select(func.count(WorkoutSession.id)).where(*completed_filter)
    ) or 0

    total_sets = db.scalar(
        select(func.count(WorkoutSet.id))
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(WorkoutSession, WorkoutExercise.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSet.completed.is_(True),
        )
    ) or 0

    total_reps = db.scalar(
        select(func.coalesce(func.sum(WorkoutSet.reps), 0))
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(WorkoutSession, WorkoutExercise.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSet.completed.is_(True),
        )
    ) or 0

    total_volume = db.scalar(
        select(
            func.coalesce(
                func.sum(WorkoutSet.reps * WorkoutSet.weight_kg), 0
            )
        )
        .join(WorkoutExercise, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .join(WorkoutSession, WorkoutExercise.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSet.completed.is_(True),
            WorkoutSet.reps.is_not(None),
            WorkoutSet.weight_kg.is_not(None),
        )
    ) or 0

    return {
        "completed_workouts": total_workouts,
        "completed_sets": total_sets,
        "completed_reps": total_reps,
        "total_volume_kg": round(float(total_volume), 2),
    }


@router.get("/history")
def get_history(db: DatabaseSession, user: CurrentUser, limit: int = 10):
    limit = max(1, min(limit, 100))

    workouts = db.scalars(
        select(WorkoutSession)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
        )
        .order_by(WorkoutSession.performed_at.desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": workout.id,
            "title": workout.title,
            "performed_at": workout.performed_at,
            "duration_minutes": (
                round((workout.ended_at - workout.started_at).total_seconds() / 60)
                if workout.ended_at and workout.started_at
                else None
            ),
            "source": workout.source,
        }
        for workout in workouts
    ]


@router.get("/muscle-groups")
def get_muscle_groups(db: DatabaseSession, user: CurrentUser):
    rows = db.execute(
        select(
            Exercise.muscle_group,
            func.count(WorkoutSet.id).label("completed_sets"),
        )
        .join(WorkoutSet, WorkoutSet.exercise_id == Exercise.id)
        .join(
            WorkoutExercise,
            WorkoutSet.workout_exercise_id == WorkoutExercise.id,
        )
        .join(WorkoutSession, WorkoutExercise.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSet.completed.is_(True),
        )
        .group_by(Exercise.muscle_group)
        .order_by(func.count(WorkoutSet.id).desc())
    ).all()

    return [
        {"muscle_group": row.muscle_group, "completed_sets": row.completed_sets}
        for row in rows
    ]


@router.get("/weekly")
def get_weekly_activity(db: DatabaseSession, user: CurrentUser):
    today = datetime.now().date()
    start_date = today - timedelta(days=6)

    workouts = db.scalars(
        select(WorkoutSession).where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSession.performed_at >= datetime.combine(start_date, datetime.min.time()),
        )
    ).all()

    counts = {}
    for day_offset in range(7):
        day = start_date + timedelta(days=day_offset)
        counts[day.isoformat()] = 0

    for workout in workouts:
        day = workout.performed_at.date().isoformat()
        if day in counts:
            counts[day] += 1

    return [
        {"date": day, "workouts": count}
        for day, count in counts.items()
    ]


@router.get("/volume-by-week")
def get_volume_by_week(db: DatabaseSession, user: CurrentUser, weeks: int = 12):
    if not 1 <= weeks <= 52:
        raise HTTPException(status_code=422, detail="weeks must be between 1 and 52")
    today = datetime.now().date()
    this_monday = today - timedelta(days=today.weekday())
    first_monday = this_monday - timedelta(weeks=weeks - 1)
    sessions = db.scalars(
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.sets)
        )
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSession.performed_at >= datetime.combine(first_monday, datetime.min.time()),
        )
    ).all()
    volumes = {}
    for offset in range(weeks):
        monday = first_monday + timedelta(weeks=offset)
        volumes[monday.isoformat()] = 0.0
    for session in sessions:
        monday = session.performed_at.date() - timedelta(
            days=session.performed_at.weekday()
        )
        if monday.isoformat() in volumes:
            for exercise in session.exercises:
                for workout_set in exercise.sets:
                    if (
                        workout_set.completed
                        and workout_set.reps is not None
                        and workout_set.weight_kg is not None
                    ):
                        volumes[monday.isoformat()] += (
                            workout_set.reps * workout_set.weight_kg
                        )
    return [
        {"week": week, "volume_kg": round(volume, 2)}
        for week, volume in volumes.items()
    ]


@router.get("/personal-records")
def get_personal_records(db: DatabaseSession, user: CurrentUser):
    rows = db.execute(
        select(
            Exercise.id,
            Exercise.name,
            WorkoutSet.weight_kg,
            WorkoutSet.reps,
            WorkoutSession.performed_at,
        )
        .join(WorkoutSet, WorkoutSet.exercise_id == Exercise.id)
        .join(
            WorkoutExercise,
            WorkoutSet.workout_exercise_id == WorkoutExercise.id,
        )
        .join(WorkoutSession, WorkoutExercise.session_id == WorkoutSession.id)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSet.completed.is_(True),
        )
        .order_by(WorkoutSession.performed_at.desc())
    ).all()
    records = {}
    for row in rows:
        record = records.setdefault(
            row.id,
            {
                "exercise_id": row.id,
                "exercise": row.name,
                "max_weight_kg": None,
                "max_reps": None,
                "estimated_1rm_kg": None,
                "performed_at": row.performed_at,
            },
        )
        if row.weight_kg is not None and (
            record["max_weight_kg"] is None
            or row.weight_kg > record["max_weight_kg"]
        ):
            record["max_weight_kg"] = row.weight_kg
            record["performed_at"] = row.performed_at
        if row.reps is not None and (
            record["max_reps"] is None or row.reps > record["max_reps"]
        ):
            record["max_reps"] = row.reps
        if row.weight_kg is not None and row.reps is not None and row.reps > 0:
            estimate = row.weight_kg * (1 + row.reps / 30)
            if (
                record["estimated_1rm_kg"] is None
                or estimate > record["estimated_1rm_kg"]
            ):
                record["estimated_1rm_kg"] = estimate
    return [
        {
            **record,
            "max_weight_kg": (
                round(record["max_weight_kg"], 2)
                if record["max_weight_kg"] is not None
                else None
            ),
            "estimated_1rm_kg": (
                round(record["estimated_1rm_kg"], 2)
                if record["estimated_1rm_kg"] is not None
                else None
            ),
        }
        for record in records.values()
    ]


@router.get("/exercise-progression/{exercise_id}")
def get_exercise_progression(
    exercise_id: int,
    db: DatabaseSession,
    user: CurrentUser,
    limit: int = 30,
):
    if not 1 <= limit <= 100:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 100")
    exercise = db.scalar(
        select(Exercise).where(
            Exercise.id == exercise_id,
            (Exercise.user_id.is_(None)) | (Exercise.user_id == user.id),
        )
    )
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")
    rows = db.execute(
        select(
            WorkoutSession.performed_at,
            WorkoutSet.weight_kg,
            WorkoutSet.reps,
        )
        .join(WorkoutExercise, WorkoutExercise.session_id == WorkoutSession.id)
        .join(WorkoutSet, WorkoutSet.workout_exercise_id == WorkoutExercise.id)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            WorkoutSet.completed.is_(True),
            WorkoutSet.exercise_id == exercise_id,
        )
        .order_by(WorkoutSession.performed_at.asc(), WorkoutSet.set_number.asc())
    ).all()
    latest = rows[-limit:]
    return {
        "exercise_id": exercise.id,
        "exercise": exercise.name,
        "formula": "Epley: weight × (1 + reps / 30)",
        "points": [
            {
                "performed_at": row.performed_at,
                "weight_kg": row.weight_kg,
                "reps": row.reps,
                "estimated_1rm_kg": (
                    round(row.weight_kg * (1 + row.reps / 30), 2)
                    if row.weight_kg is not None
                    and row.reps is not None
                    and row.reps > 0
                    else None
                ),
            }
            for row in latest
        ],
    }
