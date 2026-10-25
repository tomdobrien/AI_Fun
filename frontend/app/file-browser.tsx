"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { StoredFile, StoredFileList } from "@/lib/types";

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileBrowser({ admin = false, userId, title = "Your files", revision = 0 }: {
  admin?: boolean; userId?: number; title?: string; revision?: number;
}) {
  const [listing, setListing] = useState<StoredFileList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setListing(null);
    setPage(0);
    api.listStoredFiles(admin, userId).then((result) => { if (active) setListing(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load files."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, userId, refresh, revision]);

  async function download(file: StoredFile) {
    if (!file.id || !admin) return;
    setBusy(true);
    setError("");
    try { await api.downloadStoredFile(file.id, file.filename, userId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not download this file."); }
    finally { setBusy(false); }
  }

  const matches = listing?.files.filter((file) => file.filename.toLowerCase().includes(search.toLowerCase())) ?? [];
  const pageCount = Math.ceil(matches.length / 50);

  return <section className="file-browser" aria-label={title}>
    <div className="file-browser-heading"><div><h3>{title}</h3>{listing && <p className="field-hint">{listing.accountName}{listing.email && listing.email !== listing.accountName ? ` (${listing.email})` : ""} / {listing.files.length} files</p>}</div>
      <button className="secondary-button" type="button" disabled={loading || busy} onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
    </div>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {loading ? <p className="notice" role="status">Loading files...</p> : listing && <>
      {listing.files.length > 0 ? <>
        <label className="admin-field file-search">Find a file<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Search filenames" /></label>
        <ul className="stored-file-list">{matches.slice(page * 50, (page + 1) * 50).map((file, index) => <li key={file.id ?? `${file.filename}-${index}`}>
          <div><strong>{file.filename}</strong>{admin && file.bytes !== undefined && file.modifiedAt && <p>{sizeLabel(file.bytes)} / {new Date(file.modifiedAt).toLocaleString()}</p>}</div>
          {admin && file.id && <button className="secondary-button" type="button" disabled={busy} aria-label={`Download ${file.filename}`} onClick={() => void download(file)}>Download</button>}
        </li>)}</ul>
        {!matches.length && <p className="admin-empty">No matching files.</p>}
        {pageCount > 1 && <div className="file-pagination"><button className="secondary-button" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page + 1} of {pageCount}</span><button className="secondary-button" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
      </> : <p className="admin-empty">No files uploaded yet.</p>}
    </>}
    {busy && <p className="field-hint" role="status">Working...</p>}
  </section>;
}
