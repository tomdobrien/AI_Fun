"use client";

import { useEffect, useState } from "react";

const preferenceKey = "personal-profile-theme";

export default function ThemeToggle() {
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
    <button className="theme-toggle" type="button" onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark} title={`Switch to ${isDark ? "light" : "dark"} mode`}>
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
