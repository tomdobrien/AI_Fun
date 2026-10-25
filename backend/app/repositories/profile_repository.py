from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models import Award, Education, Experience, Link, Profile, SelectedWork, Skill
from app.schemas import ProfileUpdate

class ProfileRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_profile(self) -> Profile | None:
        statement = (select(Profile).options(
            selectinload(Profile.experience), selectinload(Profile.selected_work),
            selectinload(Profile.skills), selectinload(Profile.links),
            selectinload(Profile.awards), selectinload(Profile.education),
        ).order_by(Profile.id).limit(1))
        return self.session.scalar(statement)

    def save_profile(self, data: ProfileUpdate) -> Profile:
        profile = self.get_profile()
        if profile is None:
            profile = Profile()
            self.session.add(profile)

        profile.display_name = data.display_name
        profile.headline = data.headline
        profile.introduction = data.introduction
        profile.location = data.location
        profile.contact_email = data.contact_email
        profile.contact_phone = data.contact_phone
        profile.experience = [
            Experience(
                employer=item.employer,
                location=item.location,
                role=item.role,
                work_mode=item.work_mode,
                start_date=item.start_date,
                end_date=item.end_date,
                description="\n".join(item.responsibilities),
                highlights="\n".join(item.projects),
            )
            for item in data.experience
        ]
        profile.selected_work = [
            SelectedWork(
                title=item.title,
                summary=item.summary,
                technologies="\n".join(item.technologies),
                url=item.url,
            )
            for item in data.selected_work
        ]
        profile.skills = [Skill(name=item.name, category=item.category) for item in data.skills]
        profile.links = [Link(label=item.label, url=item.url) for item in data.links]
        profile.awards = [Award(title=item.title, organization=item.organization, date=item.date, description=item.description) for item in data.awards]
        profile.education = [Education(institution=item.institution, location=item.location, degree=item.degree, field_of_study=item.field_of_study, graduation_date=item.graduation_date) for item in data.education]
        self.session.commit()
        return profile
