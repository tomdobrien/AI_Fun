"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { routeAllowed } from "@/lib/access";
import SignIn from "./sign-in";
import { usePublicProfile } from "./profile-context";

export default function AvailabilityGate({ children }: { children: ReactNode }) {
  const { status, session, publicPermissions } = usePublicProfile();
  const pathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const path = (basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname).replace(/\/$/, "") || "/";
  const [inviteMounted, setInviteMounted] = useState(false);
  useEffect(() => {
    if (path !== "/invite") setInviteMounted(false);
    else if (status === "online") setInviteMounted(true);
  }, [path, status]);
  // Preserve the one-time token after it has been removed from the address bar.
  if (path === "/invite" && (inviteMounted || status === "online")) return <>
    {status !== "online" && <SignIn />}
    <div hidden={status !== "online"} inert={status !== "online"}>{children}</div>
  </>;
  if (status !== "online") return <SignIn />;
  if (routeAllowed(path, session, publicPermissions)) return children;
  if (!session) return <SignIn />;
  return <main className="admin-shell"><h1>Access not granted</h1><p>Ask the administrator to enable this feature for your account.</p><a href={`${basePath}/`}>Return home</a></main>;
}
