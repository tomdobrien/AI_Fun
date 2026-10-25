"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UploadInviteDetails } from "@/lib/types";
import ThemeToggle from "../theme-toggle";

const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function InvitePage() {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<UploadInviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.hash.slice(1)).get("token")
      ?? new URLSearchParams(window.location.search).get("token")
      ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    setToken(inviteToken);
    if (!inviteToken) {
      setError("This invitation link is missing its token.");
      setLoading(false);
      return;
    }
    api.getUploadInvite(inviteToken).then(setInvite)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "This invitation is not available."))
      .finally(() => setLoading(false));
  }, []);

  async function accept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api.acceptUploadInvite(token, password);
      setAccepted(true);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept this invitation.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-shell">
    <header className="admin-header"><div><p className="eyebrow">Private storage</p><h1>Set up upload access</h1><p className="admin-intro">Create a password for your photo backup account.</p></div><div className="admin-header-actions"><ThemeToggle /><a className="admin-home-link" href={`${siteBasePath}/`}>← View homepage</a></div></header>
    {loading ? <p className="notice" role="status">Checking invitation…</p> : accepted ? <section className="admin-login-card"><p className="eyebrow">Account ready</p><h2>You can sign in</h2><p className="admin-intro">Your account for {invite?.email} can upload to its own private folder.</p><a className="primary-button" href={`${siteBasePath}/upload/`}>Go to upload sign in</a></section> : invite && <form className="admin-login-card" onSubmit={accept}>
      <p className="eyebrow">Invitation for</p><h2>{invite.email}</h2>
      <p className="admin-intro">This account can upload to its own private folder. It cannot edit the site or invite other users. Choose a password with at least 12 characters.</p>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <label className="admin-field">Password<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="admin-field">Confirm password<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Creating account…" : "Accept invitation"}</button>
    </form>}
    {!loading && error && !invite && <section className="admin-login-card"><p className="notice notice-error" role="alert">{error}</p><a className="admin-home-link" href={`${siteBasePath}/upload/`}>Go to upload sign in</a></section>}
  </main>;
}
