from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DatabaseSession
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseResponse, ExerciseUpdate


router = APIRouter(prefix="/exercises", tags=["Exercises"])


def visible_exercises(user: User):
    return select(Exercise).where(
        or_(
            Exercise.user_id.is_(None),
            Exercise.user_id == user.id,
        )
    )


def get_visible_exercise(db: DatabaseSession, user: User, exercise_id: int):
    exercise = db.scalar(
        visible_exercises(user).where(Exercise.id == exercise_id)
    )

    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    return exercise


@router.get("", response_model=list[ExerciseResponse])
def list_exercises(
    db: DatabaseSession,
    user: CurrentUser,
    search: Annotated[str | None, Query(max_length=100)] = None,
    muscle_group: Annotated[str | None, Query(max_length=80)] = None,
    equipment: Annotated[str | None, Query(max_length=80)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    statement = visible_exercises(user)

    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Exercise.name.ilike(term),
                Exercise.muscle_group.ilike(term),
                Exercise.equipment.ilike(term),
            )
        )

    if muscle_group and muscle_group.strip():
        statement = statement.where(
            Exercise.muscle_group.ilike(muscle_group.strip())
        )

    if equipment and equipment.strip():
        statement = statement.where(
            Exercise.equipment.ilike(equipment.strip())
        )

    statement = (
        statement
        .order_by(Exercise.name.asc(), Exercise.id.asc())
        .offset(offset)
        .limit(limit)
    )

    return db.scalars(statement).all()


@router.post(
    "",
    response_model=ExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_exercise(
    payload: ExerciseCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    data = payload.model_dump()
    data["name"] = data["name"].strip()
    data["muscle_group"] = data["muscle_group"].strip()
    data["equipment"] = data["equipment"].strip() or "None"

    if not data["name"] or not data["muscle_group"]:
        raise HTTPException(
            status_code=422,
            detail="Name and muscle group cannot be blank",
        )

    if data["instructions"] is not None:
        data["instructions"] = data["instructions"].strip() or None

    exercise = Exercise(user_id=user.id, **data)
    db.add(exercise)
    db.commit()
    db.refresh(exercise)

    return exercise


@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(
    exercise_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    return get_visible_exercise(db, user, exercise_id)


@router.patch("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    payload: ExerciseUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    exercise = get_visible_exercise(db, user, exercise_id)

    if exercise.user_id is None:
        raise HTTPException(
            status_code=403,
            detail="Built-in exercises cannot be modified",
        )

    if exercise.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    changes = payload.model_dump(exclude_unset=True)

    for field in ("name", "muscle_group", "equipment"):
        if field in changes and changes[field] is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null",
            )

    for field, value in changes.items():
        if isinstance(value, str):
            value = value.strip()

        if field in ("name", "muscle_group") and not value:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be blank",
            )

        if field == "equipment" and not value:
            value = "None"

        if field == "instructions" and value == "":
            value = None

        setattr(exercise, field, value)

    db.commit()
    db.refresh(exercise)

    return exercise


@router.delete(
    "/{exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_exercise(
    exercise_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    exercise = get_visible_exercise(db, user, exercise_id)

    if exercise.user_id is None:
        raise HTTPException(
            status_code=403,
            detail="Built-in exercises cannot be deleted",
        )

    if exercise.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(exercise)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "This exercise is already used in workout history "
                "and cannot be deleted."
            ),
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
