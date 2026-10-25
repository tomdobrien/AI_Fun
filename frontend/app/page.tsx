"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";
import ThemeToggle from "./theme-toggle";

const emptyProfile: Profile = {
  displayName: null,
  headline: null,
  introduction: null,
  location: null,
  contactEmail: null,
  contactPhone: null,
  experience: [],
  selectedWork: [],
  skills: [],
  links: [],
  awards: [],
  education: [],
};

export default function Home() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);

  useEffect(() => {
    api.getProfile().then(setProfile)
      .catch(() => setError("Profile details could not be loaded. Check that the API is running."))
      .finally(() => setLoading(false));
  }, []);

  const hasResume = profile.experience.length + profile.selectedWork.length + profile.skills.length + profile.links.length + profile.awards.length + profile.education.length > 0;
  const skillsByCategory = profile.skills.reduce<Record<string, string[]>>((groups, skill) => {
    const category = skill.category?.trim() || "Additional skills";
    (groups[category] ??= []).push(skill.name);
    return groups;
  }, {});

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Profile home"><span className="brand-mark">{profile.displayName?.trim().charAt(0).toUpperCase() || "P"}</span><span>{profile.displayName || "Personal profile"}</span></a>
        <div className="topbar-contact">
          {profile.location && <span>{profile.location}</span>}
          {profile.contactEmail && <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>}
          {profile.contactPhone && <a href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</a>}
          <ThemeToggle />
        </div>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <p className="eyebrow">Professional profile</p>
        <h1 id="hero-title">{profile.headline || "A portfolio for the work worth sharing."}</h1>
        <p className="hero-copy">{profile.introduction || "A place to introduce yourself and share your experience, skills, and education."}</p>
        <button className="primary-button" type="button" onClick={() => setResumeOpen((open) => !open)} aria-expanded={resumeOpen} aria-controls="resume-content">{resumeOpen ? "Close resume" : "View resume"}<span aria-hidden="true">{resumeOpen ? "−" : "+"}</span></button>
      </section>

      {resumeOpen && <section className="resume-panel" id="resume-content" aria-labelledby="resume-title">
        <div className="resume-heading"><div><p className="eyebrow">Career history</p><h2 id="resume-title">Resume</h2></div><span className="status-label">{loading ? "Loading" : error ? "Unavailable" : "Current profile"}</span></div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {loading && <p className="notice" role="status">Loading profile information…</p>}
        {!loading && !error && !hasResume && <div className="empty-state"><span className="empty-mark" aria-hidden="true">+</span><div><h3>Your resume is ready for your story</h3><p>Add your experience, skills, awards, and education in the profile editor to fill out these sections.</p></div></div>}
        {!loading && !error && hasResume && <div className="resume-grid">
          <section className="resume-section resume-section-wide"><h3>Professional experience</h3>{profile.experience.length ? profile.experience.map((item, i) => <article className="entry" key={`${item.employer}-${item.role}-${i}`}>
            <div className="entry-heading"><h4>{item.employer}{item.location ? <span className="entry-location"> · {item.location}</span> : null}</h4><span>{[item.startDate, item.endDate].filter(Boolean).join(" – ")}</span></div>
            <p className="entry-meta"><strong>{item.role}</strong>{item.workMode ? ` · ${item.workMode}` : ""}</p>
            {item.responsibilities.length > 0 && <><p className="entry-subheading">Responsibilities</p><ul>{item.responsibilities.map((point, pointIndex) => <li key={`${point}-${pointIndex}`}>{point}</li>)}</ul></>}
            {item.projects.length > 0 && <><p className="entry-subheading">Projects &amp; impact</p><ul>{item.projects.map((point, pointIndex) => <li key={`${point}-${pointIndex}`}>{point}</li>)}</ul></>}
          </article>) : <p className="muted">No experience added yet.</p>}</section>

          {Object.keys(skillsByCategory).length > 0 && <section className="resume-section"><h3>Technical skills</h3><div className="skill-groups">{Object.entries(skillsByCategory).map(([category, skills]) => <p className="skill-group" key={category}><strong>{category}:</strong> {skills.join(", ")}</p>)}</div></section>}

          {profile.awards.length > 0 && <section className="resume-section"><h3>Awards</h3>{profile.awards.map((award, i) => <article className="entry" key={`${award.title}-${i}`}><div className="entry-heading"><h4>{award.title}</h4><span>{award.date}</span></div>{award.organization && <p className="entry-meta">{award.organization}</p>}{award.description && <p>{award.description}</p>}</article>)}</section>}

          {profile.education.length > 0 && <section className="resume-section"><h3>Education</h3>{profile.education.map((education, i) => <article className="entry" key={`${education.institution}-${education.degree}-${i}`}><div className="entry-heading"><h4>{education.institution}{education.location ? <span className="entry-location"> · {education.location}</span> : null}</h4><span>{education.graduationDate}</span></div><p className="entry-meta">{[education.degree, education.fieldOfStudy].filter(Boolean).join(" · ")}</p></article>)}</section>}

          {profile.selectedWork.length > 0 && <section className="resume-section"><h3>Selected work</h3>{profile.selectedWork.map((item, i) => <article className="entry" key={`${item.title}-${i}`}><h4>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</h4>{item.summary && <p>{item.summary}</p>}{item.technologies.length > 0 && <p className="entry-meta">{item.technologies.join(" · ")}</p>}</article>)}</section>}

          {profile.links.length > 0 && <section className="resume-section"><h3>Links</h3><ul className="link-list">{profile.links.map((link, i) => <li key={`${link.label}-${i}`}><a href={link.url} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true"> ↗</span></a></li>)}</ul></section>}
        </div>}
      </section>}
      <footer className="footer"><span>{profile.displayName || "Personal profile"}</span><span>Profile information managed by its owner</span></footer>
    </main>
  );
}
