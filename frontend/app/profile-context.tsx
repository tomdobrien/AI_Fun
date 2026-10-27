"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile, SiteSession } from "@/lib/types";

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
  session: SiteSession | null;
  publicPermissions: string[];
  can: (permission: string) => boolean;
};

export const PublicProfileContext = createContext<PublicProfileState>({
  profile: emptyProfile,
  loading: true,
  error: null,
  status: "checking",
  session: null,
  publicPermissions: [],
  can: () => false,
});

export function PublicProfileProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<Omit<PublicProfileState, "can">>({
    profile: emptyProfile, loading: true, error: null, status: "checking", session: null, publicPermissions: [],
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const changed = () => {
      setState({ profile: emptyProfile, loading: true, error: null, status: "checking", session: null, publicPermissions: [] });
      setRevision((value) => value + 1);
    };
    window.addEventListener("profile-session-change", changed);
    return () => window.removeEventListener("profile-session-change", changed);
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | null = null;

    function markOffline() {
      if (active) setState({ profile: emptyProfile, session: null, publicPermissions: [], loading: false, error: "The server is currently unavailable.", status: "offline" });
    }

    async function checkServer() {
      if (!active || inFlight) return;
      if (!navigator.onLine) { markOffline(); return; }
      inFlight = true;
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 5000);
      try {
        const [visitor, session] = await Promise.all([api.getPublicAccess(request.signal), api.getSiteSession(request.signal)]);
        const mayViewProfile = visitor.permissions.includes("resume:view") || session?.isAdmin || session?.permissions.includes("resume:view");
        const profile = mayViewProfile ? await api.getProfile(request.signal) : emptyProfile;
        if (active) setState({ profile, session, publicPermissions: visitor.permissions, loading: false, error: null, status: "online" });
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
  }, [revision]);

  const can = (permission: string) => state.status === "online" && Boolean(
    state.session?.isAdmin || state.session?.permissions.includes(permission) || state.publicPermissions.includes(permission));
  return <PublicProfileContext.Provider value={{ ...state, can }}>{children}</PublicProfileContext.Provider>;
}

export function usePublicProfile(): PublicProfileState {
  return useContext(PublicProfileContext);
}
