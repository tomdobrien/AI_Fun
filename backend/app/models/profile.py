from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(240), nullable=True)
    introduction: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    experience: Mapped[list["Experience"]] = relationship(back_populates="profile", cascade="all, delete-orphan", order_by="Experience.id")
    selected_work: Mapped[list["SelectedWork"]] = relationship(back_populates="profile", cascade="all, delete-orphan", order_by="SelectedWork.id")
    skills: Mapped[list["Skill"]] = relationship(back_populates="profile", cascade="all, delete-orphan", order_by="Skill.id")
    links: Mapped[list["Link"]] = relationship(back_populates="profile", cascade="all, delete-orphan", order_by="Link.id")
    awards: Mapped[list["Award"]] = relationship(back_populates="profile", cascade="all, delete-orphan", order_by="Award.id")
    education: Mapped[list["Education"]] = relationship(back_populates="profile", cascade="all, delete-orphan", order_by="Education.id")

class Experience(Base):
    __tablename__ = "experience"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    employer: Mapped[str] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    role: Mapped[str] = mapped_column(String(200))
    work_mode: Mapped[str | None] = mapped_column(String(80), nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(40), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    highlights: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile: Mapped[Profile] = relationship(back_populates="experience")

class SelectedWork(Base):
    __tablename__ = "selected_work"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    technologies: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    profile: Mapped[Profile] = relationship(back_populates="selected_work")

class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    profile: Mapped[Profile] = relationship(back_populates="skills")

class Link(Base):
    __tablename__ = "links"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    label: Mapped[str] = mapped_column(String(120))
    url: Mapped[str] = mapped_column(String(500))
    profile: Mapped[Profile] = relationship(back_populates="links")

class Award(Base):
    __tablename__ = "awards"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(240))
    organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    date: Mapped[str | None] = mapped_column(String(80), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile: Mapped[Profile] = relationship(back_populates="awards")

class Education(Base):
    __tablename__ = "education"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    institution: Mapped[str] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    degree: Mapped[str] = mapped_column(String(160))
    field_of_study: Mapped[str | None] = mapped_column(String(200), nullable=True)
    graduation_date: Mapped[str | None] = mapped_column(String(80), nullable=True)
    profile: Mapped[Profile] = relationship(back_populates="education")
