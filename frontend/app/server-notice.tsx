"use client";

import { usePublicProfile } from "./profile-context";

export default function ServerNotice() {
  const { status } = usePublicProfile();
  if (status === "online") return null;
  return <aside className={`server-notice server-notice-${status}`} role="status" aria-live="polite" aria-atomic="true">
    <span className="server-notice-label">{status === "offline" ? "Preview only" : "Checking availability"}</span>
    <div><p>{status === "offline" ? "The server is down at the moment, but here's a preview of the site." : "Checking whether the server is online..."}</p>
      <p className="server-notice-detail">{status === "offline" ? "Links and buttons are disabled. Resume access, sign-in, and uploads will return automatically when the server is back." : "Links and buttons will become available once the connection is confirmed."}</p>
    </div>
  </aside>;
}
