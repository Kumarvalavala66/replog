from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DatabaseSession
from app.models.exercise import Exercise
from app.models.plan import PlanExercise, WorkoutPlan
from app.schemas.plan import (
    PlanCreate,
    PlanExerciseCreate,
    PlanResponse,
    PlanUpdate,
)

router = APIRouter(prefix="/plans", tags=["Workout Plans"])


def get_plan(db: DatabaseSession, user_id: int, plan_id: int):
    plan = db.scalar(
        select(WorkoutPlan)
        .options(
            selectinload(WorkoutPlan.exercises)
            .selectinload(PlanExercise.exercise)
        )
        .where(
            WorkoutPlan.id == plan_id,
            WorkoutPlan.user_id == user_id,
        )
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    return plan


def validate_exercises(db: DatabaseSession, user_id: int, items):
    ids = {item.exercise_id for item in items}
    if not ids:
        return

    exercises = db.scalars(
        select(Exercise).where(
            Exercise.id.in_(ids),
            (Exercise.user_id.is_(None)) | (Exercise.user_id == user_id),
        )
    ).all()

    found = {exercise.id for exercise in exercises}
    missing = ids - found
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown exercise IDs: {sorted(missing)}",
        )


@router.get("", response_model=list[PlanResponse])
def list_plans(db: DatabaseSession, user: CurrentUser):
    return db.scalars(
        select(WorkoutPlan)
        .options(
            selectinload(WorkoutPlan.exercises)
            .selectinload(PlanExercise.exercise)
        )
        .where(WorkoutPlan.user_id == user.id)
        .order_by(WorkoutPlan.created_at.desc(), WorkoutPlan.id.desc())
    ).all()


@router.post(
    "",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_plan(
    payload: PlanCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Plan name cannot be blank")

    validate_exercises(db, user.id, payload.exercises)
    exercise_ids = [item.exercise_id for item in payload.exercises]
    if len(exercise_ids) != len(set(exercise_ids)):
        raise HTTPException(
            status_code=422,
            detail="An exercise can appear only once in a plan",
        )

    plan = WorkoutPlan(
        user_id=user.id,
        name=name,
        description=payload.description,
    )

    plan.exercises = [
        PlanExercise(
            exercise_id=item.exercise_id,
            position=item.position,
            target_sets=item.target_sets,
            target_reps_min=item.target_reps_min,
            target_reps_max=item.target_reps_max,
            target_weight_kg=item.target_weight_kg,
        )
        for item in payload.exercises
    ]

    db.add(plan)
    db.commit()
    return get_plan(db, user.id, plan.id)


@router.get("/{plan_id}", response_model=PlanResponse)
def read_plan(plan_id: int, db: DatabaseSession, user: CurrentUser):
    return get_plan(db, user.id, plan_id)


@router.patch("/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: int,
    payload: PlanUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    plan = get_plan(db, user.id, plan_id)
    changes = payload.model_dump(exclude_unset=True)

    if "name" in changes:
        if changes["name"] is None or not changes["name"].strip():
            raise HTTPException(status_code=422, detail="Plan name cannot be blank")
        changes["name"] = changes["name"].strip()

    for field, value in changes.items():
        setattr(plan, field, value)

    db.commit()
    return get_plan(db, user.id, plan.id)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, db: DatabaseSession, user: CurrentUser):
    plan = get_plan(db, user.id, plan_id)
    db.delete(plan)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{plan_id}/exercises",
    response_model=PlanResponse,
)
def add_plan_exercise(
    plan_id: int,
    payload: PlanExerciseCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    plan = get_plan(db, user.id, plan_id)
    validate_exercises(db, user.id, [payload])

    if any(item.exercise_id == payload.exercise_id for item in plan.exercises):
        raise HTTPException(
            status_code=409,
            detail="Exercise is already in this plan",
        )

    plan.exercises.append(PlanExercise(**payload.model_dump()))
    db.commit()
    return get_plan(db, user.id, plan.id)


@router.patch(
    "/{plan_id}/exercises/{item_id}",
    response_model=PlanResponse,
)
def update_plan_exercise(
    plan_id: int,
    item_id: int,
    payload: PlanExerciseCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    plan = get_plan(db, user.id, plan_id)
    item = next((entry for entry in plan.exercises if entry.id == item_id), None)

    if item is None:
        raise HTTPException(status_code=404, detail="Plan exercise not found")

    validate_exercises(db, user.id, [payload])

    duplicate = any(
        entry.id != item.id and entry.exercise_id == payload.exercise_id
        for entry in plan.exercises
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Exercise is already in this plan")

    old_position = item.position
    new_position = min(payload.position, len(plan.exercises) - 1)
    if new_position < old_position:
        for entry in plan.exercises:
            if new_position <= entry.position < old_position:
                entry.position += 1
    elif new_position > old_position:
        for entry in plan.exercises:
            if old_position < entry.position <= new_position:
                entry.position -= 1
    changes = payload.model_dump()
    changes["position"] = new_position
    for field, value in changes.items():
        setattr(item, field, value)

    db.commit()
    return get_plan(db, user.id, plan.id)


@router.delete(
    "/{plan_id}/exercises/{item_id}",
    response_model=PlanResponse,
)
def remove_plan_exercise(
    plan_id: int,
    item_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    plan = get_plan(db, user.id, plan_id)
    item = next((entry for entry in plan.exercises if entry.id == item_id), None)

    if item is None:
        raise HTTPException(status_code=404, detail="Plan exercise not found")

    plan.exercises.remove(item)
    db.commit()
    return get_plan(db, user.id, plan.id)
