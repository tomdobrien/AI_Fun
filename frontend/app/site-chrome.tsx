"use client";

import type { ReactNode } from "react";
import ThemeToggle from "./theme-toggle";
import { usePublicProfile } from "./profile-context";
import SiteLink from "./site-link";
import ServerNotice from "./server-notice";

const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const destinations = [
  { id: "home", label: "Home", href: `${siteBasePath}/` },
  { id: "resume", label: "Resume", href: `${siteBasePath}/resume/` },
  { id: "upload", label: "File backup", href: `${siteBasePath}/upload/` },
] as const;

type ActiveSection = typeof destinations[number]["id"];

export default function SiteChrome({ children, active }: Readonly<{ children: ReactNode; active: ActiveSection }>) {
  const { profile } = usePublicProfile();
  const ownerName = profile.displayName?.trim() || "Tom O’Brien";
  const initials = ownerName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return <div className="personal-site">
    <header className="site-header">
      <SiteLink className="site-wordmark" href={`${siteBasePath}/`} aria-label={`${ownerName}, home`}>
        <span className="site-monogram" aria-hidden="true">{initials || "T"}</span>
        <span className="site-wordmark-copy"><span>{ownerName}</span><span className="site-wordmark-note">Personal website</span></span>
      </SiteLink>
      <nav className="site-navigation" aria-label="Main navigation">
        {destinations.map((item) => <SiteLink key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}>{item.label}</SiteLink>)}
      </nav>
      <ThemeToggle />
    </header>
    <ServerNotice />
    {children}
    <footer className="site-footer">
      <span className="site-footer-note">Work, projects, and useful things.</span>
      <SiteLink className="owner-corner-link" href={`${siteBasePath}/admin/`} aria-label="Owner sign in">{ownerName}</SiteLink>
    </footer>
  </div>;
}

export { destinations };
