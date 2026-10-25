from pydantic import BaseModel, ConfigDict

def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)

class ApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class ExperienceItem(ApiSchema):
    employer: str
    location: str | None = None
    role: str
    work_mode: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    responsibilities: list[str] = []
    projects: list[str] = []

class SelectedWorkItem(ApiSchema):
    title: str
    summary: str | None = None
    technologies: list[str] = []
    url: str | None = None

class SkillItem(ApiSchema):
    name: str
    category: str | None = None

class LinkItem(ApiSchema):
    label: str
    url: str

class AwardItem(ApiSchema):
    title: str
    organization: str | None = None
    date: str | None = None
    description: str | None = None

class EducationItem(ApiSchema):
    institution: str
    location: str | None = None
    degree: str
    field_of_study: str | None = None
    graduation_date: str | None = None

class ProfileResponse(ApiSchema):
    display_name: str | None = None
    headline: str | None = None
    introduction: str | None = None
    location: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    experience: list[ExperienceItem] = []
    selected_work: list[SelectedWorkItem] = []
    skills: list[SkillItem] = []
    links: list[LinkItem] = []
    awards: list[AwardItem] = []
    education: list[EducationItem] = []

class ProfileUpdate(ProfileResponse):
    """Complete profile document accepted by the owner editor."""
