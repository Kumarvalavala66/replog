from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User


DatabaseSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DatabaseSession) -> User:
    # RepLog is a single-user local application.
    user = db.get(User, 1)

    if user is None:
        user = User(
            id=1,
            email="local@replog.app",
            password_hash="local-only-no-login",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
