import type { Profile } from "./types";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const api = {
  async getProfile(): Promise<Profile> {
    const response = await fetch(`${apiBaseUrl}/api/profile`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Profile API returned ${response.status}`);
    return response.json() as Promise<Profile>;
  },
  async updateProfile(profile: Profile): Promise<Profile> {
    const response = await fetch(`${apiBaseUrl}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Profile API returned ${response.status}`);
    }
    return response.json() as Promise<Profile>;
  },
};
