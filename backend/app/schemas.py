from pydantic import BaseModel, ConfigDict

def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)

class ApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class ExperienceItem(ApiSchema):
    employer: str
    role: str
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    highlights: list[str] = []

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

class ProfileResponse(ApiSchema):
    display_name: str | None = None
    headline: str | None = None
    introduction: str | None = None
    experience: list[ExperienceItem] = []
    selected_work: list[SelectedWorkItem] = []
    skills: list[SkillItem] = []
    links: list[LinkItem] = []
