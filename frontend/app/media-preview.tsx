"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { StoredFile } from "@/lib/types";
import { usePublicProfile } from "./profile-context";

function MediaGlyph({ video = false }: { video?: boolean }) {
  return <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {video ? <><rect x="2" y="3" width="20" height="18" rx="3" /><path d="m10 8 6 4-6 4Z" fill="currentColor" stroke="none" /></> : <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></>}
  </svg>;
}

export function MediaThumbnail({ file, userId, onView }: { file: StoredFile; userId?: number; onView: () => void }) {
  const { status } = usePublicProfile();
  const button = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    if (file.mediaType !== "image" || !button.current) return;
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(button.current);
    return () => observer.disconnect();
  }, [file.id, file.mediaType]);

  useEffect(() => {
    setSource(null);
    if (!visible || file.mediaType !== "image" || !file.id || status !== "online") return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    api.getImagePreview(file.id, userId, true, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch(() => { /* Keep a useful image icon if thumbnail generation is unavailable. */ });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.id, file.mediaType, userId, visible, status]);

  return <button ref={button} type="button" className={`media-thumbnail media-thumbnail-${file.mediaType}`} onClick={onView}
    aria-label={`View ${file.filename}`} disabled={status !== "online"}>
    {source ? <img src={source} alt="" loading="lazy" draggable={false} onContextMenu={(event) => event.preventDefault()} /> : file.mediaType === "image" || file.mediaType === "video" ? <MediaGlyph video={file.mediaType === "video"} /> : <span>{file.mediaType === "audio" ? "♪" : file.mediaType === "pdf" ? "PDF" : "Aa"}</span>}
    {file.mediaType === "video" && <span className="media-thumbnail-label">Video</span>}
  </button>;
}

export default function MediaPreview({ file, userId, onClose }: { file: StoredFile; userId?: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLMediaElement | null>(null);
  const Player = file.mediaType === "audio" ? "audio" : "video";
  const playback = useRef({ time: 0, playing: false });
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  function rememberPlayback() {
    if (video.current) playback.current = { time: video.current.currentTime, playing: !video.current.paused };
  }

  useEffect(() => {
    if (!file.id) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let renewal: number | undefined;
    setLoading(true);
    setError("");
    setSource(null);
    setText(null);
    setTruncated(false);

    async function load() {
      try {
        if (file.mediaType === "video" || file.mediaType === "audio") {
          const result = await api.getVideoPreview(file.id!, userId, controller.signal);
          if (controller.signal.aborted) return;
          setSource(result.url);
          const remaining = result.expiresAt * 1000 - Date.now();
          renewal = window.setTimeout(() => { rememberPlayback(); setRevision((value) => value + 1); },
            remaining > 30_000 ? remaining - 15_000 : Math.max(1000, remaining + 1000));
        } else if (file.mediaType === "image") {
          const blob = await api.getImagePreview(file.id!, userId, false, controller.signal);
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setSource(objectUrl);
        } else if (file.mediaType === "text") {
          const result = await api.getTextPreview(file.id!, userId, controller.signal);
          if (controller.signal.aborted) return;
          setText(result.text);
          setTruncated(result.truncated);
          setLoading(false);
        } else {
          const blob = await api.getPdfPreview(file.id!, userId, controller.signal);
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(blob);
          setSource(objectUrl);
          setLoading(false);
        }
      } catch (cause) {
        if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Could not open this preview."); setLoading(false); }
      }
    }
    void load();
    return () => {
      controller.abort();
      window.clearTimeout(renewal);
      const element = video.current;
      if (element) { element.pause(); element.removeAttribute("src"); element.load(); }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, file.mediaType, userId, revision]);

  return <dialog ref={dialog} className="media-dialog" aria-labelledby="media-preview-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="media-dialog-content" onContextMenu={(event) => event.preventDefault()}>
      <header className="media-dialog-header"><div><p className="eyebrow">{file.mediaType === "video" ? "Video player" : file.mediaType === "audio" ? "Audio player" : file.mediaType === "text" ? "Text preview" : file.mediaType === "pdf" ? "PDF preview" : "Image preview"}</p><h2 id="media-preview-title">{file.filename}</h2></div>
        <button className="secondary-button" type="button" onClick={onClose}>Close</button>
      </header>
      {loading && <p className="media-loading" role="status">Loading preview...</p>}
      {error && <div className="media-preview-error"><p className="notice notice-error" role="alert">{error}</p><button className="secondary-button" type="button" onClick={() => { rememberPlayback(); setRevision((value) => value + 1); }}>Retry preview</button></div>}
      {text !== null && <pre className="media-text-preview">{text}</pre>}
      {truncated && <p className="media-loading">Showing the first 1 MB of this file.</p>}
      {source && <div className={`media-canvas${zoomed ? " media-canvas-zoomed" : ""}`}>
        {file.mediaType === "video" || file.mediaType === "audio" ? <Player ref={(element) => { video.current = element; }} src={source} controls controlsList="nodownload noremoteplayback" disablePictureInPicture
          crossOrigin="anonymous" playsInline preload="metadata"
          onLoadedMetadata={() => {
            setLoading(false);
            if (video.current && playback.current.time > 0) {
              video.current.currentTime = playback.current.time;
              if (playback.current.playing) void video.current.play().catch(() => {});
            }
          }}
          onError={() => { setLoading(false); setError("This video could not be played. Its format may not be supported by your browser."); }} /> : file.mediaType === "pdf" ?
          <iframe title={file.filename} src={`${source}#toolbar=0`} className="media-pdf-preview" /> :
          <img src={source} alt={file.filename} draggable={false} onDragStart={(event) => event.preventDefault()}
            onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError("This image preview could not be displayed."); }} />}
      </div>}
      {source && file.mediaType === "image" && !error && <footer className="media-dialog-footer"><span>Display-sized preview</span><button className="secondary-button" type="button" onClick={() => setZoomed((value) => !value)}>{zoomed ? "Fit to screen" : "Zoom in"}</button></footer>}
    </div>
  </dialog>;
}
