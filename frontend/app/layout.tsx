import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Personal Profile", description: "A personal introduction and resume." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(() => { try { const saved = localStorage.getItem("personal-profile-theme"); const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.dataset.theme = dark ? "dark" : "light"; } catch { document.documentElement.dataset.theme = "light"; } })();` }} /></head><body>{children}</body></html>;
}
