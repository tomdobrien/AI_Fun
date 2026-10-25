"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import ThemeToggle from "../theme-toggle";

const siteBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function UploadPage() {
  const [user, setUser] = useState<{ email: string; displayName: string | null } | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getUploadSession().then(setUser).catch(() => setError("Could not verify your upload access."))
      .finally(() => setChecking(false));
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.loginUploadUser(email, password);
      setUser({ email: email.trim().toLowerCase(), displayName: null });
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    let saved = 0;
    let skipped = 0;
    for (const [index, file] of files.entries()) {
      setProgress(`Uploading and checking ${index + 1} of ${files.length}: ${file.name}`);
      try {
        const result = await api.uploadPhoto(file);
        if (result.duplicate) skipped += 1;
        else saved += 1;
      } catch (cause) {
        setError(`${saved} uploaded, ${skipped} duplicates skipped. ${cause instanceof Error ? cause.message : "Upload failed."}`);
        setFiles(files.slice(index));
        setProgress("");
        setBusy(false);
        return;
      }
    }
    setProgress("");
    setNotice(saved ? `${saved} new ${saved === 1 ? "file was" : "files were"} saved; ${skipped} duplicates skipped.` : `No new files were saved; ${skipped} duplicates skipped.`);
    setFiles([]);
    if (input.current) input.current.value = "";
    setBusy(false);
  }

  function logout() {
    api.clearUploadSession();
    setUser(null);
    setFiles([]);
    setNotice("");
  }

  return <main className="admin-shell">
    <header className="admin-header">
      <div><p className="eyebrow">Private storage</p><h1>File backup</h1><p className="admin-intro">Sign in to upload files to your private Pi folder.</p></div>
      <div className="admin-header-actions">{user && <button className="secondary-button" type="button" onClick={logout}>Log out</button>}<ThemeToggle /><a className="admin-home-link" href={`${siteBasePath}/`}>← View homepage</a></div>
    </header>
    {checking ? <p className="notice" role="status">Checking upload access…</p> : user ? <>
      <section className="admin-card admin-upload-card">
        <p className="eyebrow">Signed in as</p><h2>{user.displayName || user.email}</h2><p className="admin-intro">Uploads go to your own folder and are private. Any file type is accepted, up to 100 MB per file. Exact duplicates are skipped.</p>
        <form className="admin-upload-form" onSubmit={upload}>
          <label className="admin-field">Files<input ref={input} type="file" multiple disabled={busy} onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setNotice(""); setError(""); }} /></label>
          {files.length > 0 && <p className="admin-empty">{files.length} {files.length === 1 ? "file" : "files"} selected</p>}
          {progress && <p className="notice" role="status">{progress}</p>}
          {notice && <p className="notice notice-success" role="status">{notice}</p>}
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy || !files.length}>{busy ? "Uploading…" : "Upload to my folder"}</button>
        </form>
      </section>
    </> : <form className="admin-login-card" onSubmit={login}>
      <p className="eyebrow">Invited uploader</p><h2>Sign in</h2>
      <p className="admin-intro">Upload access is provided by the site owner. This account cannot edit the resume or invite people.</p>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <label className="admin-field">Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="admin-field">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>}
  </main>;
}
