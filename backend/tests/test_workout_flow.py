import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.api.routes.analytics import router as analytics_router
from app.api.routes.exercises import router as exercises_router
from app.api.routes.plans import router as plans_router
from app.api.routes.workouts import router as workouts_router
from app.db.base import Base


class WorkoutFlowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
        )
        self.app = FastAPI()
        self.app.include_router(exercises_router)
        self.app.include_router(plans_router)
        self.app.include_router(workouts_router)
        self.app.include_router(analytics_router)

        def override_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        self.app.dependency_overrides[get_db] = override_db
        self.client = TestClient(self.app)
        exercise = self.client.post(
            "/exercises",
            json={
                "name": "Test Squat",
                "muscle_group": "Legs",
                "equipment": "Barbell",
            },
        )
        self.assertEqual(exercise.status_code, 201)
        self.exercise_id = exercise.json()["id"]

    def tearDown(self):
        self.client.close()
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def test_plan_to_completed_workout_and_analytics(self):
        plan = self.client.post(
            "/plans",
            json={
                "name": "Strength",
                "exercises": [
                    {
                        "exercise_id": self.exercise_id,
                        "position": 0,
                        "target_sets": 2,
                        "target_reps_min": 5,
                        "target_reps_max": 8,
                        "target_weight_kg": 60,
                    }
                ],
            },
        )
        self.assertEqual(plan.status_code, 201, plan.text)
        self.assertEqual(
            plan.json()["exercises"][0]["target_weight_kg"],
            60,
        )

        created = self.client.post(
            "/workouts",
            json={"title": "Strength", "plan_id": plan.json()["id"]},
        )
        self.assertEqual(created.status_code, 201, created.text)
        workout = created.json()
        self.assertEqual(workout["status"], "in_progress")
        self.assertEqual(len(workout["exercises"][0]["sets"]), 2)
        set_id = workout["exercises"][0]["sets"][0]["id"]

        active = self.client.get("/workouts/active")
        self.assertEqual(active.status_code, 200, active.text)
        self.assertEqual(active.json()["id"], workout["id"])
        duplicate = self.client.post("/workouts", json={"title": "Duplicate"})
        self.assertEqual(duplicate.status_code, 409)

        update = self.client.patch(
            f"/workouts/{workout['id']}/sets/{set_id}",
            json={"weight_kg": 60, "reps": 6, "completed": True},
        )
        self.assertEqual(update.status_code, 200, update.text)
        finished = self.client.post(f"/workouts/{workout['id']}/finish")
        self.assertEqual(finished.status_code, 200, finished.text)
        self.assertEqual(finished.json()["status"], "completed")

        summary = self.client.get("/analytics/summary").json()
        self.assertEqual(summary["completed_workouts"], 1)
        self.assertEqual(summary["completed_sets"], 1)
        self.assertEqual(summary["completed_reps"], 6)
        self.assertEqual(summary["total_volume_kg"], 360)
        records = self.client.get("/analytics/personal-records").json()
        self.assertEqual(records[0]["max_weight_kg"], 60)
        self.assertEqual(records[0]["max_reps"], 6)
        edited = self.client.patch(
            f"/workouts/{workout['id']}/sets/{set_id}",
            json={"weight_kg": 62.5, "reps": 6, "completed": True},
        )
        self.assertEqual(edited.status_code, 200, edited.text)

        next_workout = self.client.post("/workouts", json={"title": "Next session"})
        self.assertEqual(next_workout.status_code, 201, next_workout.text)
        next_exercise = self.client.post(
            f"/workouts/{next_workout.json()['id']}/exercises",
            json={"exercise_id": self.exercise_id},
        )
        self.assertEqual(next_exercise.status_code, 200, next_exercise.text)
        previous = self.client.get(
            f"/workouts/{next_workout.json()['id']}/exercises/{self.exercise_id}/previous"
        )
        self.assertEqual(previous.status_code, 200, previous.text)
        self.assertEqual(previous.json()["sets"][0]["weight_kg"], 62.5)

    def test_historical_session_never_becomes_active(self):
        manual = self.client.post(
            "/workouts",
            json={
                "title": "Earlier session",
                "source": "manual",
                "performed_at": "2024-01-02T09:30:00",
                "exercises": [
                    {
                        "exercise_id": self.exercise_id,
                        "sets": [
                            {
                                "set_number": 1,
                                "reps": 10,
                                "weight_kg": 20,
                                "completed": True,
                            }
                        ],
                    }
                ],
            },
        )
        self.assertEqual(manual.status_code, 201, manual.text)
        self.assertEqual(manual.json()["status"], "completed")
        self.assertEqual(self.client.get("/workouts/active").json(), None)
        rejected = self.client.patch(
            f"/workouts/{manual.json()['id']}",
            json={"status": "in_progress"},
        )
        self.assertEqual(rejected.status_code, 422)


if __name__ == "__main__":
    unittest.main()
