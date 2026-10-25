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
};

const PublicProfileContext = createContext<PublicProfileState>({
  profile: emptyProfile,
  loading: true,
  error: null,
});

export function PublicProfileProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, setState] = useState<PublicProfileState>({ profile: emptyProfile, loading: true, error: null });

  useEffect(() => {
    api.getProfile()
      .then((profile) => setState({ profile, loading: false, error: null }))
      .catch(() => setState({ profile: emptyProfile, loading: false, error: "Profile details could not be loaded." }));
  }, []);

  return <PublicProfileContext.Provider value={state}>{children}</PublicProfileContext.Provider>;
}

export function usePublicProfile(): PublicProfileState {
  return useContext(PublicProfileContext);
}
