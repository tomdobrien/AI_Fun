"use client";

import SiteChrome from "./site-chrome";
import { usePublicProfile } from "./profile-context";
import SiteLink from "./site-link";

const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const allSections = [
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

export default function HomeView() {
  const { profile, can } = usePublicProfile();
  const sections = allSections.filter((section) => section.tone === "resume" ? can("resume:view") : can("files:upload") || can("files:view"));
  const displayName = profile.displayName?.trim();
  const title = profile.headline?.trim() || (displayName ? `A little about ${displayName}.` : "Work, life, and what comes next.");
  const description = profile.introduction?.trim() || "A personal site for the things I’m working on, the work I’ve done, and whatever belongs here next.";

  return <SiteChrome active="home">
    <main className="home-page">
      <section className="home-opening" aria-labelledby="home-title">
        <div className="home-opening-copy">
          <p className="home-kicker"><span className="home-kicker-mark" aria-hidden="true" />A personal corner of the web</p>
          <h1 id="home-title">{title}</h1>
          <p className="home-introduction">{description}</p>
          {profile.location && <p className="home-location"><span aria-hidden="true">↳</span> Based in {profile.location}</p>}
        </div>
        <aside className="home-index" aria-label="Site directory">
          <div className="home-index-heading"><span>The directory</span><span aria-hidden="true">/ {sections.length.toString().padStart(2, "0")}</span></div>
          <p className="home-index-title">Work &amp;<br /><em>everyday things.</em></p>
          <nav aria-label="Quick links">{sections.map((section) => <SiteLink href={section.href} key={section.number}>
            <span className="home-index-number">{section.number}</span><span>{section.title}</span><span aria-hidden="true">↗</span>
          </SiteLink>)}</nav>
          <p className="home-index-note">A little background. A few useful tools.</p>
        </aside>
      </section>

      <section className="site-directory" aria-labelledby="directory-title">
        <div className="directory-heading">
          <div><p className="home-kicker">Browse</p><h2 id="directory-title">Find your way around</h2></div>
          <p>Explore my background or head straight to your files.</p>
        </div>
        <div className="directory-list">
          {sections.length === 0 && <p>No features have been shared with your account yet. Ask the administrator for access.</p>}
          {sections.map((section) => <SiteLink className={`directory-item directory-item-${section.tone}`} href={section.href} key={section.number}>
            <span className="directory-number">{section.number}</span>
            <span className="directory-copy"><strong>{section.title}</strong><span>{section.description}</span></span>
            <span className="directory-action">{section.action}<span aria-hidden="true">↗</span></span>
          </SiteLink>)}
        </div>
      </section>

      {(profile.contactEmail || profile.contactPhone) && <section className="home-contact-strip" aria-label="Contact information">
        <span>Get in touch</span>
        <div>
          {profile.contactEmail && <SiteLink href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</SiteLink>}
          {profile.contactPhone && <SiteLink href={`tel:${profile.contactPhone}`}>{profile.contactPhone}</SiteLink>}
        </div>
      </section>}
    </main>
  </SiteChrome>;
}
