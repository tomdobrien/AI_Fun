from app.repositories.profile_repository import ProfileRepository
from app.schemas import AwardItem, EducationItem, ExperienceItem, LinkItem, ProfileResponse, ProfileUpdate, SelectedWorkItem, SkillItem

def _lines(value: str | None) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()] if value else []

class ProfileService:
    def __init__(self, repository: ProfileRepository) -> None:
        self.repository = repository

    def get_profile(self) -> ProfileResponse:
        profile = self.repository.get_profile()
        if profile is None:
            return ProfileResponse()
        return ProfileResponse(
            display_name=profile.display_name, headline=profile.headline, introduction=profile.introduction,
            location=profile.location, contact_email=profile.contact_email, contact_phone=profile.contact_phone,
            experience=[ExperienceItem(employer=x.employer, location=x.location, role=x.role, work_mode=x.work_mode, start_date=x.start_date, end_date=x.end_date, responsibilities=_lines(x.description), projects=_lines(x.highlights)) for x in profile.experience],
            selected_work=[SelectedWorkItem(title=x.title, summary=x.summary, technologies=_lines(x.technologies), url=x.url) for x in profile.selected_work],
            skills=[SkillItem(name=x.name, category=x.category) for x in profile.skills],
            links=[LinkItem(label=x.label, url=x.url) for x in profile.links],
            awards=[AwardItem(title=x.title, organization=x.organization, date=x.date, description=x.description) for x in profile.awards],
            education=[EducationItem(institution=x.institution, location=x.location, degree=x.degree, field_of_study=x.field_of_study, graduation_date=x.graduation_date) for x in profile.education],
        )

    def update_profile(self, data: ProfileUpdate) -> ProfileResponse:
        self.repository.save_profile(data)
        return self.get_profile()
