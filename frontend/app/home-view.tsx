"use client";

import SiteChrome from "./site-chrome";
import { usePublicProfile } from "./profile-context";
import SiteLink from "./site-link";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function HomeView() {
  const { profile, status } = usePublicProfile();
  return <SiteChrome active="home">
    <main className="home-page">
      <section className="intro-hero" aria-labelledby="home-title">
        <div className="intro-copy">
          <p className="home-kicker"><span className="home-kicker-mark" aria-hidden="true" />{profile.headline}</p>
          <h1 id="home-title">A little about<br /><em>Thomas.</em></h1>
          <p className="intro-description">{profile.introduction}</p>
          <div className="intro-actions">
            <SiteLink className="primary-button" href={`${basePath}/resume/`}>Explore my resume <span aria-hidden="true">↗</span></SiteLink>
            {profile.contactEmail && <SiteLink className="intro-contact" href={`mailto:${profile.contactEmail}`}>Get in touch <span aria-hidden="true">↗</span></SiteLink>}
          </div>
          <p className="intro-location"><svg aria-hidden="true" width="15" height="18" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M17 9c0 6-7 12-7 12S3 15 3 9a7 7 0 1 1 14 0Z"/><circle cx="10" cy="9" r="2.5"/></svg>{profile.location}</p>
        </div>
        <aside className="profile-panel" aria-label="Background at a glance">
          <div className="panel-topline"><span>Software / Engineering</span><span aria-hidden="true">NC / USA</span></div>
          <div className="engineering-art" aria-hidden="true">
            <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-orbit orbit-three"/>
            <div className="art-axis"/><span className="art-point point-one"/><span className="art-point point-two"/>
            <span className="art-initials">TO<span>.</span></span><span className="art-caption">An engineer’s perspective</span>
          </div>
          <div className="panel-caption"><span>My background</span><span aria-hidden="true">↙</span></div>
          <div className="panel-facts"><span>Currently <strong>CaptiveAire Systems</strong></span><span>Electrical &amp; computer engineering <strong>NC State University</strong></span></div>
        </aside>
      </section>
      <section className="home-destinations" aria-labelledby="destinations-title">
        <div className="destinations-heading"><p className="home-kicker">A little background. A few useful tools.</p><h2 id="destinations-title">Make yourself at home.</h2></div>
        <div className="destination-grid">
          <SiteLink className="destination-card" href={`${basePath}/resume/`}>
            <div className="destination-meta"><span>01 / Professional</span><span>Open to everyone</span></div>
            <div className="destination-title"><h3>My resume</h3><span className="destination-arrow" aria-hidden="true">↗</span></div>
            <p>The experience and education behind my work.</p>
            <span className="destination-cta">Read my background <span aria-hidden="true">→</span></span>
          </SiteLink>
          <SiteLink className="destination-card backup-card" href={`${basePath}/upload/`}>
            <div className="destination-meta"><span>02 / Personal tools</span><span className="private-label"><svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor"><rect x="1" y="6" width="10" height="7" rx="1"/><path d="M3 6V4a3 3 0 0 1 6 0v2"/></svg>Sign-in required</span></div>
            <div className="destination-title"><h3>File backup</h3><span className="destination-arrow" aria-hidden="true">↗</span></div>
            <p>A private space for invited people to store and browse their files.</p>
            <span className="destination-cta">Go to file backup <span aria-hidden="true">→</span></span>
            <span className={`backup-status backup-status-${status}`}><span aria-hidden="true"/>{status === "online" ? "Server available" : status === "checking" ? "Checking server availability" : "Server offline · Please check back later"}</span>
          </SiteLink>
          <SiteLink className="destination-card" href={`${basePath}/guild-bounty/`}>
            <div className="destination-meta"><span>03 / Interactive example</span><span>Open to everyone</span></div>
            <div className="destination-title"><h3>Guild Bounty</h3><span className="destination-arrow" aria-hidden="true">↗</span></div>
            <p>A fantasy-inspired gaming bounty board prototype.</p>
            <span className="destination-cta">Explore the board <span aria-hidden="true">→</span></span>
          </SiteLink>
        </div>
      </section>
      {profile.contactEmail && <section className="contact-endnote" aria-label="Get in touch"><p>Have something in mind?<br /><span>I’d be glad to hear from you.</span></p><SiteLink href={`mailto:${profile.contactEmail}`}>{profile.contactEmail} <span aria-hidden="true">↗</span></SiteLink></section>}
    </main>
  </SiteChrome>;
}
