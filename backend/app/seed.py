from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.exercise import Exercise


EXERCISES = [
    ("Barbell Bench Press", "Chest", "Barbell"),
    ("Dumbbell Bench Press", "Chest", "Dumbbell"),
    ("Incline Dumbbell Press", "Chest", "Dumbbell"),
    ("Cable Fly", "Chest", "Cable"),
    ("Push-Up", "Chest", "Bodyweight"),
    ("Forward Lunge", "Quadriceps", "Bodyweight"),
    ("Barbell Back Squat", "Quadriceps", "Barbell"),
    ("Leg Press", "Quadriceps", "Machine"),
    ("Leg Extension", "Quadriceps", "Machine"),
    ("Romanian Deadlift", "Hamstrings", "Barbell"),
    ("Leg Curl", "Hamstrings", "Machine"),
    ("Barbell Deadlift", "Back", "Barbell"),
    ("Lat Pulldown", "Back", "Cable"),
    ("Seated Cable Row", "Back", "Cable"),
    ("One-Arm Dumbbell Row", "Back", "Dumbbell"),
    ("Pull-Up", "Back", "Bodyweight"),
    ("Barbell Overhead Press", "Shoulders", "Barbell"),
    ("Dumbbell Lateral Raise", "Shoulders", "Dumbbell"),
    ("Reverse Fly", "Shoulders", "Dumbbell"),
    ("Barbell Biceps Curl", "Biceps", "Barbell"),
    ("Hammer Curl", "Biceps", "Dumbbell"),
    ("Triceps Pushdown", "Triceps", "Cable"),
    ("Overhead Triceps Extension", "Triceps", "Dumbbell"),
    ("Standing Calf Raise", "Calves", "Machine"),
    ("Plank", "Core", "Bodyweight"),
    ("Hanging Knee Raise", "Core", "Bodyweight"),
    ("Hip Thrust", "Glutes", "Barbell"),
]

DEFAULT_INSTRUCTIONS = (
    "Use controlled repetitions, maintain good technique, "
    "and choose a load appropriate for your ability."
)


def seed_exercises():
    added = 0

    with SessionLocal() as db:
        for name, muscle_group, equipment in EXERCISES:
            existing = db.scalar(
                select(Exercise).where(
                    Exercise.user_id.is_(None),
                    Exercise.name == name,
                )
            )

            if existing:
                continue

            db.add(
                Exercise(
                    user_id=None,
                    name=name,
                    muscle_group=muscle_group,
                    equipment=equipment,
                    instructions=DEFAULT_INSTRUCTIONS,
                )
            )
            added += 1

        db.commit()

    print(f"Exercise seeding complete. Added {added} built-in exercises.")


if __name__ == "__main__":
    seed_exercises()
