"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";

const emptyProfile: Profile = { displayName: null, headline: null, introduction: null, experience: [], selectedWork: [], skills: [], links: [] };

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

  const hasResume = profile.experience.length + profile.selectedWork.length + profile.skills.length + profile.links.length > 0;
  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Profile home"><span className="brand-mark">{profile.displayName?.trim().charAt(0).toUpperCase() || "P"}</span><span>{profile.displayName || "Personal profile"}</span></a>
        <span className="topbar-note">A personal introduction</span>
      </header>
      <section className="hero" id="top" aria-labelledby="hero-title">
        <p className="eyebrow">Personal profile</p>
        <h1 id="hero-title">{profile.headline || "A portfolio for the work worth sharing."}</h1>
        <p className="hero-copy">{profile.introduction || "A place to introduce yourself and share your experience, selected work, and skills."}</p>
        <button className="primary-button" type="button" onClick={() => setResumeOpen((open) => !open)} aria-expanded={resumeOpen} aria-controls="resume-content">{resumeOpen ? "Close resume" : "View resume"}<span aria-hidden="true">{resumeOpen ? "?" : "+"}</span></button>
      </section>
      {resumeOpen && <section className="resume-panel" id="resume-content" aria-labelledby="resume-title">
        <div className="resume-heading"><div><p className="eyebrow">Profile details</p><h2 id="resume-title">Resume &amp; CV</h2></div><span className="status-label">{loading ? "Loading" : error ? "Unavailable" : "Current profile"}</span></div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {loading && <p className="notice" role="status">Loading profile information?</p>}
        {!loading && !error && !hasResume && <div className="empty-state"><span className="empty-mark" aria-hidden="true">?</span><div><h3>Your resume is ready for your story</h3><p>No profile entries have been added yet. Add your experience, work, skills, and links to the local database to fill out these sections.</p></div></div>}
        {!loading && !error && hasResume && <div className="resume-grid">
          <section className="resume-section"><h3>Experience</h3>{profile.experience.length ? profile.experience.map((item, i) => <article className="entry" key={`${item.employer}-${item.role}-${i}`}><div className="entry-heading"><h4>{item.role}</h4><span>{[item.startDate, item.endDate].filter(Boolean).join(" ? ")}</span></div><p className="entry-meta">{item.employer}</p>{item.description && <p>{item.description}</p>}{item.highlights.length > 0 && <ul>{item.highlights.map((point) => <li key={point}>{point}</li>)}</ul>}</article>) : <p className="muted">No experience added yet.</p>}</section>
          <section className="resume-section"><h3>Selected work</h3>{profile.selectedWork.length ? profile.selectedWork.map((item, i) => <article className="entry" key={`${item.title}-${i}`}><h4>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : item.title}</h4>{item.summary && <p>{item.summary}</p>}{item.technologies.length > 0 && <p className="entry-meta">{item.technologies.join(" ? ")}</p>}</article>) : <p className="muted">No selected work added yet.</p>}</section>
          <section className="resume-section"><h3>Skills</h3>{profile.skills.length ? <ul className="skill-list">{profile.skills.map((skill, i) => <li className="skill-chip" key={`${skill.name}-${i}`}>{skill.name}{skill.category ? <span>{skill.category}</span> : null}</li>)}</ul> : <p className="muted">No skills added yet.</p>}</section>
          <section className="resume-section"><h3>Contact &amp; links</h3>{profile.links.length ? <ul className="link-list">{profile.links.map((link, i) => <li key={`${link.label}-${i}`}><a href={link.url} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true"> ?</span></a></li>)}</ul> : <p className="muted">No links added yet.</p>}</section>
        </div>}
      </section>}
      <footer className="footer"><span>{profile.displayName || "Personal profile"}</span><span>Profile information managed by its owner</span></footer>
    </main>
  );
}
