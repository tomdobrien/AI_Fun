import type { Metadata } from "next";
import "./globals.css";
import { PublicProfileProvider } from "./profile-context";
import AvailabilityGate from "./availability-gate";

export const metadata: Metadata = {
  title: "Private site",
  description: "Sign in to access shared features.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><meta name="referrer" content="no-referrer" /><script dangerouslySetInnerHTML={{ __html: `(() => { try { const saved = localStorage.getItem("personal-profile-theme"); const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.dataset.theme = dark ? "dark" : "light"; } catch { document.documentElement.dataset.theme = "light"; } })();` }} /></head><body><PublicProfileProvider><AvailabilityGate>{children}</AvailabilityGate></PublicProfileProvider></body></html>;
}
