import type { SiteSession } from "./types";

export function routeAllowed(path: string, session: SiteSession | null, publicPermissions: string[]): boolean {
  const can = (permission: string) => Boolean(session?.isAdmin || session?.permissions.includes(permission) || publicPermissions.includes(permission));
  if (path === "/admin" || path === "/invite") return true;
  if (path === "/resume") return can("resume:view");
  if (path === "/upload") return Boolean(session) && (can("files:upload") || can("files:view"));
  return Boolean(session);
}
