from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models import Profile

class ProfileRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_profile(self) -> Profile | None:
        statement = (select(Profile).options(
            selectinload(Profile.experience), selectinload(Profile.selected_work),
            selectinload(Profile.skills), selectinload(Profile.links),
        ).order_by(Profile.id).limit(1))
        return self.session.scalar(statement)
