"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile, SiteSession } from "@/lib/types";

import { publicProfile } from "@/lib/public-profile";

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
  profile: publicProfile,
  loading: false,
  error: null,
  status: "checking",
  session: null,
  publicPermissions: [],
  can: () => false,
});

export function PublicProfileProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<Omit<PublicProfileState, "can">>({
    profile: publicProfile, loading: false, error: null, status: "checking", session: null, publicPermissions: [],
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const changed = () => {
      setState({ profile: publicProfile, loading: false, error: null, status: "checking", session: null, publicPermissions: [] });
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
      if (active) setState({ profile: publicProfile, session: null, publicPermissions: [], loading: false, error: "The server is currently unavailable.", status: "offline" });
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
        const profile = publicProfile;
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
