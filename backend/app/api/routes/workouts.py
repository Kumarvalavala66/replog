from datetime import datetime
from threading import Lock
from typing import Literal

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DatabaseSession
from app.models.exercise import Exercise
from app.models.plan import WorkoutPlan
from app.models.plan import PlanExercise
from app.models.workout import WorkoutExercise, WorkoutSession, WorkoutSet
from app.schemas.workout import (
    WorkoutExerciseCreate,
    WorkoutExercisePositionUpdate,
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutSessionUpdate,
    WorkoutSetUpdate,
)

router = APIRouter(prefix="/workouts", tags=["Workout Sessions"])
ACTIVE_SESSION_LOCK = Lock()


def get_session(db: DatabaseSession, user_id: int, session_id: int):
    session = db.scalar(
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.sets),
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.exercise),
        )
        .where(
            WorkoutSession.id == session_id,
            WorkoutSession.user_id == user_id,
        )
    )

    if session is None:
        raise HTTPException(status_code=404, detail="Workout session not found")

    return session


def validate_exercise_ids(db: DatabaseSession, user_id: int, exercise_ids: set[int]):
    if not exercise_ids:
        return

    exercises = db.scalars(
        select(Exercise).where(
            Exercise.id.in_(exercise_ids),
            (Exercise.user_id.is_(None)) | (Exercise.user_id == user_id),
        )
    ).all()

    found = {exercise.id for exercise in exercises}
    missing = exercise_ids - found

    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown exercise IDs: {sorted(missing)}",
        )


def build_exercises(items):
    result = []

    for item in items:
        workout_exercise = WorkoutExercise(
            exercise_id=item.exercise_id,
            position=item.position,
        )

        workout_exercise.sets = [
            WorkoutSet(
                exercise_id=item.exercise_id,
                set_number=set_item.set_number,
                reps=set_item.reps,
                weight_kg=set_item.weight_kg,
                completed=set_item.completed,
                notes=set_item.notes,
            )
            for set_item in item.sets
        ]

        result.append(workout_exercise)

    return result


def active_session_query(user_id: int):
    return (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.sets),
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.exercise),
        )
        .where(
            WorkoutSession.user_id == user_id,
            WorkoutSession.source == "live",
            WorkoutSession.status == "in_progress",
        )
        .order_by(WorkoutSession.started_at.desc(), WorkoutSession.id.desc())
    )


@router.get("", response_model=list[WorkoutSessionResponse])
def list_workouts(
    db: DatabaseSession,
    user: CurrentUser,
    session_status: Literal["in_progress", "completed", "cancelled"] | None = None,
    limit: int = 50,
    offset: int = 0,
):
    if not 1 <= limit <= 100 or offset < 0:
        raise HTTPException(
            status_code=422,
            detail="limit must be 1-100 and offset must be non-negative",
        )

    statement = (
        select(WorkoutSession)
        .options(
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.sets)
        )
        .where(WorkoutSession.user_id == user.id)
    )

    if session_status:
        statement = statement.where(WorkoutSession.status == session_status)

    statement = statement.order_by(
        WorkoutSession.performed_at.desc(),
        WorkoutSession.id.desc(),
    ).offset(offset).limit(limit)

    return db.scalars(statement).all()


@router.get("/active", response_model=WorkoutSessionResponse | None)
def get_active_workout(db: DatabaseSession, user: CurrentUser):
    return db.scalars(active_session_query(user.id).limit(1)).first()


@router.post(
    "",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_workout(
    payload: WorkoutSessionCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    title = payload.title.strip()

    if not title:
        raise HTTPException(status_code=422, detail="Workout title cannot be blank")

    exercise_ids = [item.exercise_id for item in payload.exercises]

    if len(exercise_ids) != len(set(exercise_ids)):
        raise HTTPException(
            status_code=422,
            detail="An exercise can appear only once in a workout session",
        )

    validate_exercise_ids(db, user.id, set(exercise_ids))

    plan = None
    if payload.plan_id is not None:
        plan = db.scalar(
            select(WorkoutPlan)
            .options(
                selectinload(WorkoutPlan.exercises)
                .selectinload(PlanExercise.exercise)
            )
            .where(
                WorkoutPlan.id == payload.plan_id,
                WorkoutPlan.user_id == user.id,
            )
        )

        if plan is None:
            raise HTTPException(status_code=404, detail="Workout plan not found")

    now = datetime.now()

    if payload.source == "manual":
        session_status = "completed"
        performed_at = payload.performed_at
        started_at = payload.started_at
        ended_at = payload.ended_at or payload.performed_at
    else:
        session_status = "in_progress"
        performed_at = payload.performed_at or now
        started_at = payload.started_at or now
        ended_at = payload.ended_at

    workout_exercises = payload.exercises
    if payload.source == "live" and plan is not None and not workout_exercises:
        workout_exercises = [
            WorkoutExerciseCreate(
                exercise_id=item.exercise_id,
                position=item.position,
                sets=[
                    {
                        "set_number": set_number,
                        "reps": item.target_reps_min,
                        "weight_kg": item.target_weight_kg,
                    }
                    for set_number in range(1, item.target_sets + 1)
                ],
            )
            for item in plan.exercises
        ]

    workout = WorkoutSession(
        user_id=user.id,
        plan_id=payload.plan_id,
        title=title,
        source=payload.source,
        status=session_status,
        performed_at=performed_at,
        started_at=started_at,
        ended_at=ended_at,
        notes=payload.notes,
        exercises=build_exercises(workout_exercises),
    )

    with ACTIVE_SESSION_LOCK:
        if payload.source == "live":
            existing_active = db.scalar(
                select(WorkoutSession.id).where(
                    WorkoutSession.user_id == user.id,
                    WorkoutSession.source == "live",
                    WorkoutSession.status == "in_progress",
                ).limit(1)
            )
            if existing_active is not None:
                raise HTTPException(
                    status_code=409,
                    detail="An active workout already exists. Resume or finish it first.",
                )
        db.add(workout)
        db.commit()

    return get_session(db, user.id, workout.id)


@router.get("/{session_id}", response_model=WorkoutSessionResponse)
def read_workout(
    session_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    return get_session(db, user.id, session_id)


@router.get(
    "/{session_id}/exercises/{exercise_id}/previous",
)
def get_previous_performance(
    session_id: int,
    exercise_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)
    previous = db.scalar(
        select(WorkoutSession)
        .join(WorkoutExercise, WorkoutExercise.session_id == WorkoutSession.id)
        .options(
            selectinload(WorkoutSession.exercises)
            .selectinload(WorkoutExercise.sets)
        )
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.status == "completed",
            (
                (WorkoutSession.performed_at < workout.performed_at)
                | (
                    (WorkoutSession.performed_at == workout.performed_at)
                    & (WorkoutSession.id < workout.id)
                )
            ),
            WorkoutExercise.exercise_id == exercise_id,
            WorkoutExercise.sets.any(WorkoutSet.completed.is_(True)),
        )
        .order_by(WorkoutSession.performed_at.desc(), WorkoutSession.id.desc())
        .limit(1)
    )
    if previous is None:
        return None

    previous_exercise = next(
        item for item in previous.exercises if item.exercise_id == exercise_id
    )
    return {
        "performed_at": previous.performed_at,
        "sets": [
            {
                "set_number": item.set_number,
                "reps": item.reps,
                "weight_kg": item.weight_kg,
                "completed": item.completed,
            }
            for item in previous_exercise.sets
            if item.completed
        ],
    }


@router.patch("/{session_id}", response_model=WorkoutSessionResponse)
def update_workout(
    session_id: int,
    payload: WorkoutSessionUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)
    changes = payload.model_dump(exclude_unset=True)

    if "title" in changes:
        if changes["title"] is None or not changes["title"].strip():
            raise HTTPException(status_code=422, detail="Title cannot be blank")
        changes["title"] = changes["title"].strip()

    if "status" in changes:
        if changes["status"] not in ("in_progress", "completed", "cancelled"):
            raise HTTPException(
                status_code=422,
                detail="status must be in_progress, completed, or cancelled",
            )
        if workout.source == "manual" and changes["status"] == "in_progress":
            raise HTTPException(
                status_code=422,
                detail="Manually entered workouts cannot be made active",
            )
        if changes["status"] == "in_progress" and not (
            workout.source == "live" and workout.status == "in_progress"
        ):
            with ACTIVE_SESSION_LOCK:
                existing_active = db.scalar(
                    select(WorkoutSession.id).where(
                        WorkoutSession.user_id == user.id,
                        WorkoutSession.source == "live",
                        WorkoutSession.status == "in_progress",
                        WorkoutSession.id != workout.id,
                    ).limit(1)
                )
            if existing_active is not None:
                raise HTTPException(
                    status_code=409,
                    detail="Another active workout already exists. Finish it first.",
                )

        if changes["status"] == "completed" and "ended_at" not in changes:
            changes["ended_at"] = datetime.now()

    for field, value in changes.items():
        setattr(workout, field, value)

    if (
        workout.started_at is not None
        and workout.ended_at is not None
        and workout.ended_at < workout.started_at
    ):
        raise HTTPException(
            status_code=422,
            detail="ended_at cannot be before started_at",
        )

    db.commit()
    return get_session(db, user.id, workout.id)


@router.post(
    "/{session_id}/exercises",
    response_model=WorkoutSessionResponse,
)
def add_workout_exercise(
    session_id: int,
    payload: WorkoutExerciseCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)

    if workout.status != "in_progress":
        raise HTTPException(
            status_code=409,
            detail="Exercises can only be added to an active workout",
        )

    if any(item.exercise_id == payload.exercise_id for item in workout.exercises):
        raise HTTPException(status_code=409, detail="Exercise already added")

    validate_exercise_ids(db, user.id, {payload.exercise_id})

    workout.exercises.append(build_exercises([payload])[0])
    db.commit()

    return get_session(db, user.id, workout.id)


@router.patch(
    "/{session_id}/exercises/{workout_exercise_id}/position",
    response_model=WorkoutSessionResponse,
)
def reorder_workout_exercise(
    session_id: int,
    workout_exercise_id: int,
    payload: WorkoutExercisePositionUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)
    if workout.status != "in_progress":
        raise HTTPException(status_code=409, detail="Only active workouts can be edited")
    exercise = next(
        (item for item in workout.exercises if item.id == workout_exercise_id),
        None,
    )
    if exercise is None:
        raise HTTPException(status_code=404, detail="Workout exercise not found")
    old_position = exercise.position
    new_position = min(payload.position, len(workout.exercises) - 1)
    if new_position < old_position:
        for item in workout.exercises:
            if new_position <= item.position < old_position:
                item.position += 1
    elif new_position > old_position:
        for item in workout.exercises:
            if old_position < item.position <= new_position:
                item.position -= 1
    exercise.position = new_position
    db.commit()
    return get_session(db, user.id, workout.id)


@router.patch(
    "/{session_id}/sets/{set_id}",
    response_model=WorkoutSessionResponse,
)
def update_workout_set(
    session_id: int,
    set_id: int,
    payload: WorkoutSetUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)

    if workout.status == "cancelled":
        raise HTTPException(
            status_code=409,
            detail="Cancelled workouts cannot be edited",
        )

    workout_set = next(
        (
            item
            for exercise in workout.exercises
            for item in exercise.sets
            if item.id == set_id
        ),
        None,
    )

    if workout_set is None:
        raise HTTPException(status_code=404, detail="Workout set not found")

    changes = payload.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(workout_set, field, value)

    db.commit()
    return get_session(db, user.id, workout.id)


@router.delete(
    "/{session_id}/sets/{set_id}",
    response_model=WorkoutSessionResponse,
)
def remove_workout_set(
    session_id: int,
    set_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)
    if workout.status == "cancelled":
        raise HTTPException(status_code=409, detail="Cancelled workouts cannot be edited")
    workout_set = next(
        (
            item
            for exercise in workout.exercises
            for item in exercise.sets
            if item.id == set_id
        ),
        None,
    )
    if workout_set is None:
        raise HTTPException(status_code=404, detail="Workout set not found")
    exercise = workout_set.workout_exercise
    exercise.sets.remove(workout_set)
    for index, item in enumerate(sorted(exercise.sets, key=lambda row: row.set_number), 1):
        item.set_number = index
    db.commit()
    return get_session(db, user.id, workout.id)


@router.post(
    "/{session_id}/exercises/{workout_exercise_id}/sets",
    response_model=WorkoutSessionResponse,
)
def add_workout_set(
    session_id: int,
    workout_exercise_id: int,
    payload: WorkoutSetUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)

    if workout.status != "in_progress":
        raise HTTPException(
            status_code=409,
            detail="Only active workouts can be edited",
        )

    exercise = next(
        (item for item in workout.exercises if item.id == workout_exercise_id),
        None,
    )

    if exercise is None:
        raise HTTPException(status_code=404, detail="Workout exercise not found")

    next_number = max((item.set_number for item in exercise.sets), default=0) + 1
    if next_number > 100:
        raise HTTPException(status_code=409, detail="An exercise cannot have more than 100 sets")

    new_set = WorkoutSet(
        exercise_id=exercise.exercise_id,
        set_number=next_number,
        reps=payload.reps,
        weight_kg=payload.weight_kg,
        completed=payload.completed if payload.completed is not None else False,
        notes=payload.notes,
    )

    exercise.sets.append(new_set)
    db.commit()

    return get_session(db, user.id, workout.id)


@router.delete(
    "/{session_id}/exercises/{workout_exercise_id}",
    response_model=WorkoutSessionResponse,
)
def remove_workout_exercise(
    session_id: int,
    workout_exercise_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)

    if workout.status != "in_progress":
        raise HTTPException(
            status_code=409,
            detail="Only active workouts can be edited",
        )

    exercise = next(
        (item for item in workout.exercises if item.id == workout_exercise_id),
        None,
    )

    if exercise is None:
        raise HTTPException(status_code=404, detail="Workout exercise not found")

    workout.exercises.remove(exercise)
    for position, item in enumerate(workout.exercises):
        item.position = position
    db.commit()

    return get_session(db, user.id, workout.id)


@router.post("/{session_id}/finish", response_model=WorkoutSessionResponse)
def finish_workout(
    session_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)

    if workout.status != "in_progress":
        raise HTTPException(status_code=409, detail="Workout is not active")

    workout.status = "completed"
    workout.ended_at = datetime.now()

    db.commit()
    return get_session(db, user.id, workout.id)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout(
    session_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    workout = get_session(db, user.id, session_id)
    db.delete(workout)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
