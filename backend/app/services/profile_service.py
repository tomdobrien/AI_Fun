from app.repositories.profile_repository import ProfileRepository
from app.schemas import ExperienceItem, LinkItem, ProfileResponse, SelectedWorkItem, SkillItem

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
            experience=[ExperienceItem(employer=x.employer, role=x.role, start_date=x.start_date, end_date=x.end_date, description=x.description, highlights=_lines(x.highlights)) for x in profile.experience],
            selected_work=[SelectedWorkItem(title=x.title, summary=x.summary, technologies=_lines(x.technologies), url=x.url) for x in profile.selected_work],
            skills=[SkillItem(name=x.name, category=x.category) for x in profile.skills],
            links=[LinkItem(label=x.label, url=x.url) for x in profile.links],
        )
