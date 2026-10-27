"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import SiteChrome from "../site-chrome";
import FileBrowser from "../file-browser";
import { usePublicProfile } from "../profile-context";

export default function UploadPage() {
  const { session: user, can } = usePublicProfile();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fileRevision, setFileRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);

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
        setFileRevision((value) => value + 1);
        return;
      }
    }
    setProgress("");
    setNotice(saved ? `${saved} new ${saved === 1 ? "file was" : "files were"} saved; ${skipped} duplicates skipped.` : `No new files were saved; ${skipped} duplicates skipped.`);
    setFiles([]);
    if (input.current) input.current.value = "";
    setBusy(false);
    setFileRevision((value) => value + 1);
  }

  return <SiteChrome active="upload">
    <main className="upload-page">
      <div className="upload-page-heading">
        <div><p className="home-kicker">02 / Private storage</p><h1>File backup</h1><p>Send files to your own private folder on the Pi.</p></div>
      </div>
      {can("files:upload") && <section className="admin-card admin-upload-card">
        <p className="eyebrow">Signed in as</p><h2>{user?.displayName || user?.email}</h2>
        <p className="admin-intro">Uploads go to your own folder and are private. Any file type is accepted, up to 500 MB per file. Supported text, code, images, video, audio, and PDF files can be viewed here. Exact duplicates are skipped.</p>
        <form className="admin-upload-form" onSubmit={upload}>
          <label className="admin-field">Files<input ref={input} type="file" multiple disabled={busy} onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setNotice(""); setError(""); }} /></label>
          {files.length > 0 && <p className="admin-empty">{files.length} {files.length === 1 ? "file" : "files"} selected</p>}
          {progress && <p className="notice" role="status">{progress}</p>}
          {notice && <p className="notice notice-success" role="status">{notice}</p>}
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy || !files.length}>{busy ? "Uploading…" : "Upload to my folder"}</button>
        </form>
      </section>}
      {can("files:view") && <section className="admin-card"><FileBrowser revision={fileRevision} /></section>}
    </main>
  </SiteChrome>;
}
