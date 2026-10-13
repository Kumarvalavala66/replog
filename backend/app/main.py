from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy import inspect
from sqlalchemy.exc import SQLAlchemyError

from app import models  # noqa: F401
from app.api.routes.exercises import router as exercises_router
from app.api.routes.plans import router as plans_router
from app.api.routes.workouts import router as workouts_router
from app.api.routes.analytics import router as analytics_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if "target_weight_kg" not in {
        column["name"] for column in inspect(engine).get_columns("plan_exercises")
    }:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE plan_exercises ADD COLUMN target_weight_kg FLOAT")
            )
    yield


app = FastAPI(
    title=settings.app_name,
    description="Workout tracking API for RepLog",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        settings.frontend_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exercises_router)
app.include_router(plans_router)
app.include_router(workouts_router)
app.include_router(analytics_router)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "message": "RepLog API is running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from exc
