"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { usePublicProfile } from "./profile-context";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function SignIn() {
  const { status, can } = usePublicProfile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await api.loginUploadUser(email, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not sign in."); }
    finally { setBusy(false); }
  }

  return <main className="admin-shell private-entry">
    <form className="admin-login-card" onSubmit={login}>
      <p className="eyebrow">Private site</p><h1>Sign in</h1>
      <p className="admin-intro">Access is by invitation. Sign in to use the features shared with you.</p>
      {status !== "online" && <p className="notice" role="status">{status === "checking" ? "Checking access…" : "The server is unavailable. Please try again shortly."}</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <label className="admin-field">Email<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="admin-field">Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="primary-button" disabled={busy || status !== "online"}>{busy ? "Signing in…" : "Sign in"}</button>
      {can("resume:view") && <a className="site-text-link" href={`${basePath}/resume/`}>View public resume</a>}
      <a className="site-text-link" href={`${basePath}/admin/`}>Administrator sign in</a>
    </form>
  </main>;
}
