"use client";

import SiteChrome from "./site-chrome";
import { usePublicProfile } from "./profile-context";

const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const sections = [
  {
    number: "01",
    title: "Resume",
    description: "Experience, selected work, skills, and the details behind them.",
    href: `${siteBasePath}/resume/`,
    action: "Read the resume",
    tone: "resume",
  },
  {
    number: "02",
    title: "File backup",
    description: "A private place for invited people to send files to their own folder.",
    href: `${siteBasePath}/upload/`,
    action: "Open file backup",
    tone: "storage",
  },
];

export default function Home() {
  const { profile, loading, error } = usePublicProfile();
  const displayName = profile.displayName?.trim();
  const title = profile.headline?.trim() || (displayName ? `A little about ${displayName}.` : "Work, life, and what comes next.");
  const description = profile.introduction?.trim() || "A personal site for the things I’m working on, the work I’ve done, and whatever belongs here next.";

  return <SiteChrome active="home">
    <main className="home-page">
      <section className="home-opening" aria-labelledby="home-title">
        <div className="home-opening-copy">
          <p className="home-kicker"><span className="home-kicker-mark" aria-hidden="true" />An open notebook / personal site</p>
          <h1 id="home-title">{title}</h1>
          <p className="home-introduction">{description}</p>
          {profile.location && <p className="home-location"><span aria-hidden="true">↳</span> Based in {profile.location}</p>}
          {error && <p className="notice notice-error" role="status">The latest profile details are unavailable right now.</p>}
        </div>
        <aside className="home-margin-note" aria-label="Site note">
          <span className="home-margin-index">INDEX<br />00—02</span>
          <p>{loading ? "Gathering the latest details…" : "A few useful places to start."}</p>
          <span className="home-margin-symbol" aria-hidden="true">✳</span>
        </aside>
      </section>

      <section className="site-directory" aria-labelledby="directory-title">
        <div className="directory-heading">
          <div><p className="home-kicker">Browse</p><h2 id="directory-title">Find your way around</h2></div>
          <p>More sections can be added here as the site grows.</p>
        </div>
        <div className="directory-list">
          {sections.map((section) => <a className={`directory-item directory-item-${section.tone}`} href={section.href} key={section.number}>
            <span className="directory-number">{section.number}</span>
            <span className="directory-copy"><strong>{section.title}</strong><span>{section.description}</span></span>
            <span className="directory-action">{section.action}<span aria-hidden="true">↗</span></span>
          </a>)}
        </div>
      </section>

      <section className="home-contact-strip" aria-label="Contact information">
        <span>Elsewhere</span>
        <div>
          {profile.contactEmail && <a href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>}
          {profile.contactPhone && <a href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</a>}
          {!profile.contactEmail && !profile.contactPhone && <span>Contact details will appear here when added.</span>}
        </div>
      </section>
    </main>
  </SiteChrome>;
}
