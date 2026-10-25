"use client";

import { useEffect, useState, type ReactNode } from "react";
import HomeView from "./home-view";
import { usePublicProfile } from "./profile-context";

export default function AvailabilityGate({ children }: { children: ReactNode }) {
  const { status } = usePublicProfile();
  const [hasConnected, setHasConnected] = useState(false);
  const previewOnly = status !== "online";

  useEffect(() => {
    if (status === "online") setHasConnected(true);
  }, [status]);

  return <>
    {previewOnly && <HomeView />}
    {/* Preserve mounted forms through an outage, including one-time invitation tokens. */}
    <div className="availability-route" hidden={previewOnly} inert={previewOnly}>
      {(hasConnected || !previewOnly) && children}
    </div>
  </>;
}
