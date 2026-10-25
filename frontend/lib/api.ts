import type { Profile, UploadInvitation, UploadInviteDetails, UploadUser } from "./types";
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
  async uploadPhoto(file: File): Promise<{ filename: string; bytes: number; duplicate: boolean }> {
    const response = await fetch(`${apiBaseUrl}/api/admin/photos`, {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        ...adminAuthorization(),
      },
      body: file,
    });
    if (!response.ok) {
      throw new Error(await errorMessage(response, `Upload failed for ${file.name}.`));
    }
    return response.json() as Promise<{ filename: string; bytes: number; duplicate: boolean }>;
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
  async listUploadUsers(): Promise<UploadUser[]> {
    const response = await fetch(`${apiBaseUrl}/api/admin/upload-users`, { cache: "no-store", headers: adminAuthorization() });
    if (!response.ok) throw new Error(await errorMessage(response, "Could not load upload accounts."));
    return response.json() as Promise<UploadUser[]>;
  },
  async listUploadInvitations(): Promise<UploadInvitation[]> {
    const response = await fetch(`${apiBaseUrl}/api/admin/invitations`, { cache: "no-store", headers: adminAuthorization() });
    if (!response.ok) throw new Error(await errorMessage(response, "Could not load invitations."));
    return response.json() as Promise<UploadInvitation[]>;
  },
  async createUploadInvitation(email: string, displayName: string): Promise<{ id: number; email: string; token: string; expiresAt: string }> {
    const response = await fetch(`${apiBaseUrl}/api/admin/invitations`, {
      method: "POST", headers: { "Content-Type": "application/json", ...adminAuthorization() },
      body: JSON.stringify({ email, displayName: displayName || null }),
    });
    if (!response.ok) throw new Error(await errorMessage(response, "Could not create invitation."));
    return response.json();
  },
  async revokeUploadInvitation(id: number): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/admin/invitations/${id}/revoke`, { method: "POST", headers: adminAuthorization() });
    if (!response.ok) throw new Error(await errorMessage(response, "Could not revoke invitation."));
  },
  async disableUploadUser(id: number): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/admin/upload-users/${id}/disable`, { method: "POST", headers: adminAuthorization() });
    if (!response.ok) throw new Error(await errorMessage(response, "Could not disable account."));
  },
  async getUploadInvite(token: string): Promise<UploadInviteDetails> {
    const response = await fetch(`${apiBaseUrl}/api/upload/invitations/validate`, {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error(await errorMessage(response, "This invitation is invalid, expired, or already used."));
    return response.json() as Promise<UploadInviteDetails>;
  },
  async acceptUploadInvite(token: string, password: string): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/upload/invitations/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
    });
    if (!response.ok) throw new Error(await errorMessage(response, "Could not accept this invitation."));
  },
  async loginUploadUser(email: string, password: string): Promise<string> {
    const response = await fetch(`${apiBaseUrl}/api/upload/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(await errorMessage(response, "Upload sign in failed."));
    const result = await response.json() as { token?: string };
    if (!result.token) throw new Error("Upload sign in did not return a session token.");
    adminSessionToken = result.token;
    return result.token;
  },
  async getUploadSession(): Promise<{ email: string; displayName: string | null } | null> {
    if (!adminSessionToken) return null;
    const response = await fetch(`${apiBaseUrl}/api/upload/session`, { cache: "no-store", headers: adminAuthorization() });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(await errorMessage(response, "Could not verify upload access."));
    return response.json() as Promise<{ email: string; displayName: string | null }>;
  },
  clearUploadSession(): void { adminSessionToken = null; },
};
