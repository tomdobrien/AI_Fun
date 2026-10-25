"use client";

import { useEffect, useState } from "react";
import { usePublicProfile } from "./profile-context";

const preferenceKey = "personal-profile-theme";

export default function ThemeToggle() {
  const { status } = usePublicProfile();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.dataset.theme === "dark");
    try {
      if (localStorage.getItem(preferenceKey) !== null) return;
    } catch {
      // Keep following the device preference when browser storage is unavailable.
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = (event: MediaQueryListEvent) => {
      document.documentElement.dataset.theme = event.matches ? "dark" : "light";
      setIsDark(event.matches);
    };
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem(preferenceKey, nextTheme);
    } catch {
      // The current page still changes even when the preference cannot be saved.
    }
    setIsDark(nextTheme === "dark");
  }

  return (
    <button className="theme-toggle" type="button" onClick={toggleTheme} disabled={status !== "online"}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark} title={`Switch to ${isDark ? "light" : "dark"} mode`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {isDark ? <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z" />}
      </svg>
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
