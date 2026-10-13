from app.db.base import Base
from app.db.session import engine
from app import models  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("RepLog database initialized successfully.")
    print("Tables:", ", ".join(Base.metadata.tables.keys()))


if __name__ == "__main__":
    init_db()
