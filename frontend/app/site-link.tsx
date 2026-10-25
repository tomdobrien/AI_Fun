"use client";

import type { AnchorHTMLAttributes } from "react";
import { usePublicProfile } from "./profile-context";

export default function SiteLink({ href, onClick, onKeyDown, title, tabIndex, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { status } = usePublicProfile();
  const disabled = status !== "online";
  return <a {...props} href={disabled ? undefined : href}
    role={disabled ? "link" : props.role}
    aria-disabled={disabled || undefined}
    tabIndex={disabled ? -1 : tabIndex}
    title={disabled ? "Available when the server is online" : title}
    onClick={(event) => { if (disabled) event.preventDefault(); else onClick?.(event); }}
    onKeyDown={(event) => { if (disabled) event.preventDefault(); else onKeyDown?.(event); }} />;
}
