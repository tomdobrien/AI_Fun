import type { Profile } from "./types";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const api = {
  async getProfile(): Promise<Profile> {
    const response = await fetch(`${apiBaseUrl}/api/profile`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Profile API returned ${response.status}`);
    return response.json() as Promise<Profile>;
  },
};
