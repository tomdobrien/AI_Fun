import type { Profile } from "./types";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:8001" : "");
let adminSessionToken: string | null = null;

function adminAuthorization(): Record<string, string> {
  return adminSessionToken ? { Authorization: `Bearer ${adminSessionToken}` } : {};
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { detail?: string };
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

export const api = {
  async getProfile(): Promise<Profile> {
    const response = await fetch(`${apiBaseUrl}/api/profile`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Profile API returned ${response.status}`);
    return response.json() as Promise<Profile>;
  },
  async updateProfile(profile: Profile): Promise<Profile> {
    const response = await fetch(`${apiBaseUrl}/api/profile`, {
      method: "PUT",
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...adminAuthorization() },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response, `Profile API returned ${response.status}`));
    }
    return response.json() as Promise<Profile>;
  },
  async getAdminSession(): Promise<boolean> {
    if (!adminSessionToken) return false;
    const response = await fetch(`${apiBaseUrl}/api/admin/session`, {
      cache: "no-store",
      credentials: "omit",
      headers: adminAuthorization(),
    });
    if (response.status === 401) return false;
    if (!response.ok) throw new Error(await errorMessage(response, "Could not verify admin access."));
    return true;
  },
  async loginAdmin(password: string): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error(await errorMessage(response, "Admin login failed."));
    const result = await response.json() as { token?: string };
    if (!result.token) throw new Error("Admin login did not return a session token.");
    adminSessionToken = result.token;
  },
  async logoutAdmin(): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/admin/logout`, {
      method: "POST",
      credentials: "omit",
      headers: adminAuthorization(),
    });
    adminSessionToken = null;
    if (!response.ok) throw new Error(await errorMessage(response, "Could not log out."));
  },
};
