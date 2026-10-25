"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile } from "@/lib/types";

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

type PublicProfileState = {
  profile: Profile;
  loading: boolean;
  error: string | null;
  status: "checking" | "online" | "offline";
};

export const PublicProfileContext = createContext<PublicProfileState>({
  profile: emptyProfile,
  loading: true,
  error: null,
  status: "checking",
});

export function PublicProfileProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<PublicProfileState>({ profile: emptyProfile, loading: true, error: null, status: "checking" });

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;

    function markOffline() {
      if (active) setState((previous) => ({ ...previous, loading: false, error: "The server is currently unavailable.", status: "offline" }));
    }

    async function checkServer() {
      if (!active || inFlight) return;
      if (!navigator.onLine) { markOffline(); return; }
      inFlight = true;
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 5000);
      try {
        const profile = await api.getProfile(request.signal);
        if (active) setState({ profile, loading: false, error: null, status: "online" });
      } catch {
        markOffline();
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
      }
    }

    function checkVisiblePage() {
      if (document.visibilityState === "visible") void checkServer();
    }
    function networkOffline() {
      controller?.abort();
      markOffline();
    }

    void checkServer();
    const interval = window.setInterval(checkVisiblePage, 30_000);
    window.addEventListener("online", checkVisiblePage);
    window.addEventListener("offline", networkOffline);
    window.addEventListener("focus", checkVisiblePage);
    document.addEventListener("visibilitychange", checkVisiblePage);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("online", checkVisiblePage);
      window.removeEventListener("offline", networkOffline);
      window.removeEventListener("focus", checkVisiblePage);
      document.removeEventListener("visibilitychange", checkVisiblePage);
    };
  }, []);

  return <PublicProfileContext.Provider value={state}>{children}</PublicProfileContext.Provider>;
}

export function usePublicProfile(): PublicProfileState {
  return useContext(PublicProfileContext);
}
