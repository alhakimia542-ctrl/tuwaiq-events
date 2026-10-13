"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

// ── Types ──────────────────────────────────────────────────────────────────────

type GalleryItem = {
  id: string;
  imageURL: string;
  caption: string;
  category: string;
  createdAt: string;
};

const CATEGORIES = [
  "حفلات زفاف",
  "ليالي الملكة",
  "مؤتمرات وشركات",
  "ديكور وتنسيق",
  "كوش الأفراح",
  "طاولات وضيافة",
  "إضاءة وصوتيات",
  "جلسات ملكية",
  "تنسيق ورود",
  "تصوير كادر تصويري زفاف",
  "تصميم بالذكاء الاصطناعي"
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  // Multi-file state
  const [files, setFiles] = useState<File[]>([]);
  const [previewURLs, setPreviewURLs] = useState<string[]>([]);

  // Upload progress: per-file index + overall percentage
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null); // which file is currently uploading
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gallery');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed to load gallery.');
      setItems((json.items ?? []) as GalleryItem[]);
    } catch (err: any) {
      console.error('[fetchItems]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // Revoke object URLs on unmount / file change to avoid memory leaks
  useEffect(() => {
    return () => previewURLs.forEach((u) => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewURLs]);

  // ── File selection ────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    // Revoke any previous previews
    previewURLs.forEach((u) => URL.revokeObjectURL(u));
    setFiles(selected);
    setPreviewURLs(selected.map((f) => URL.createObjectURL(f)));
  };

  // Remove a single file from the selection
  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewURLs[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewURLs((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Upload (sequential per-file) ──────────────────────────────────────────────
  const uploadSingleFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress(pct);
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length || !caption.trim()) return;

    setIsUploading(true);
    setUploadError(null);

    let anyFailed = false;

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadingIndex(i);
        setUploadProgress(0);

        // 1️⃣  Upload file to Firebase Storage
        let imageURL: string;
        try {
          imageURL = await uploadSingleFile(files[i]);
        } catch (storageErr: any) {
          console.error(`[Storage upload failed] file ${i}:`, storageErr);
          setUploadError(`Storage upload failed: ${storageErr?.message ?? 'Unknown error'}`);
          anyFailed = true;
          continue;
        }

        // 2️⃣  Save metadata to Firestore via the server-side API route
        try {
          const res = await fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageURL, caption, category }),
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.message ?? `Server responded with ${res.status}`);
          }
        } catch (firestoreErr: any) {
          console.error(`[Firestore write failed] file ${i}:`, firestoreErr);
          setUploadError(`Saved to Storage but Firestore write failed: ${firestoreErr?.message ?? 'Unknown error'}`);
          anyFailed = true;
          // Do NOT continue — still try remaining files
        }
      }
    } finally {
      // Reset form only on full success
      if (!anyFailed) {
        previewURLs.forEach((u) => URL.revokeObjectURL(u));
        setFiles([]);
        setPreviewURLs([]);
        setCaption("");
        setCategory(CATEGORIES[0]);
        setShowForm(false);
      }
      setUploadProgress(0);
      setUploadingIndex(null);
      setIsUploading(false);
      await fetchItems(); // always refresh the grid
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (item: GalleryItem) => {
    if (!confirm(`Delete "${item.caption}"?`)) return;
    setDeletingId(item.id);
    try {
      // 1️⃣  Delete from Firebase Storage (best-effort)
      if (item.imageURL) {
        try {
          // getDownloadURL returns a URL with a token; we need the storage path.
          // Try to derive the path from the URL, fall back to treating imageURL as a path.
          const storageRef = item.imageURL.startsWith('https://')
            ? ref(storage, decodeURIComponent(item.imageURL.split('/o/')[1]?.split('?')[0] ?? ''))
            : ref(storage, item.imageURL);
          await deleteObject(storageRef);
        } catch (_) { /* ignore — file may already be gone or URL is external */ }
      }

      // 2️⃣  Delete Firestore record via server-side API route
      const res = await fetch('/api/gallery', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? `Server responded with ${res.status}`);
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err: any) {
      console.error('[handleDelete]', err);
      alert(`Failed to delete: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20
        bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-6">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-violet-400/70 uppercase mb-1">
              Media Library
            </p>
            <h2 className="text-2xl font-bold text-white">Gallery Management</h2>
            <p className="text-sm text-slate-400 mt-1">
              {loading ? "Loading…" : `${items.length} image${items.length !== 1 ? "s" : ""} in Firestore`}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold
              shadow-lg shadow-violet-500/20 transition-all duration-200 shrink-0"
          >
            {showForm ? "✕ Cancel" : "+ Upload Photos"}
          </button>
        </div>
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* ── Upload form ── */}
      {showForm && (
        <form
          onSubmit={handleUpload}
          className="rounded-2xl border border-violet-500/20 bg-[#0f1117] p-6 space-y-5"
        >
          <p className="text-sm font-bold text-white">New Gallery Images</p>

          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative min-h-52 rounded-xl border-2 border-dashed border-white/10
              hover:border-violet-500/40 bg-white/[0.02] flex flex-col items-center
              justify-center cursor-pointer transition-all duration-200 overflow-hidden p-4"
          >
            {previewURLs.length > 0 ? (
              /* ── Preview strip ── */
              <div className="w-full flex flex-wrap gap-3 justify-center" onClick={(e) => e.stopPropagation()}>
                {previewURLs.map((url, idx) => (
                  <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                    <Image src={url} alt={`preview-${idx}`} fill className="object-cover" />
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-red-400
                        text-[10px] flex items-center justify-center hover:bg-red-500/40 transition-colors"
                    >
                      ✕
                    </button>
                    {/* Uploading indicator */}
                    {isUploading && uploadingIndex === idx && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">{uploadProgress}%</span>
                      </div>
                    )}
                    {/* Done indicator */}
                    {isUploading && uploadingIndex !== null && idx < uploadingIndex && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-400 text-base">✓</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* Add more button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-lg border-2 border-dashed border-white/10
                    hover:border-violet-500/40 flex items-center justify-center
                    text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
                >
                  <span className="text-2xl">+</span>
                </div>
              </div>
            ) : (
              <>
                <span className="text-4xl mb-2">🖼️</span>
                <p className="text-sm text-slate-400">Click to select one or more images</p>
                <p className="text-xs text-slate-600 mt-1">JPG, PNG, WEBP up to 10 MB each · multiple files supported</p>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Selected count badge */}
          {files.length > 0 && (
            <p className="text-xs text-violet-400 font-semibold">
              {files.length} image{files.length !== 1 ? "s" : ""} selected
              {files.length > 1 && " · all will share the same caption & category"}
            </p>
          )}

          {/* Caption + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Caption (Title)</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                required
                placeholder="e.g. كوشة زفاف ملكية"
                className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08]
                  text-white text-sm placeholder:text-slate-600 focus:outline-none
                  focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08]
                  text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors [&>option]:bg-[#0f1117]"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Overall progress bar (shown while uploading) */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  Uploading {uploadingIndex !== null ? uploadingIndex + 1 : 0} of {files.length}…
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error banner */}
          {uploadError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <span className="text-red-400 text-sm leading-snug">⚠ {uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="ml-auto text-red-400/60 hover:text-red-400 text-sm shrink-0"
              >✕</button>
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading || files.length === 0}
            className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white
              font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 shadow-lg shadow-violet-500/20"
          >
            {isUploading
              ? `Uploading ${(uploadingIndex ?? 0) + 1} / ${files.length}…`
              : `Save ${files.length > 1 ? `${files.length} Images` : "to Gallery"}`}
          </button>
        </form>
      )}

      {/* ── Image grid ── */}
      <section>
        <h3 className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-4">
          Live Gallery · {items.length} Items
        </h3>

        {loading ? (
          <div className="py-8 sm:py-12 md:py-24 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 sm:py-12 md:py-24 text-center text-slate-500 text-sm">
            No images yet. Click &quot;Upload Photos&quot; to add the first one.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-2xl overflow-hidden
                  border border-white/[0.07] hover:border-violet-500/40 bg-[#0f1117]
                  transition-all duration-300 flex flex-col"
              >
                {/* ── Image area ── */}
                <div className="relative aspect-square w-full overflow-hidden">
                  <Image
                    src={img.imageURL}
                    alt={img.caption}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Deleting overlay */}
                  {deletingId === img.id && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
                      <div className="w-6 h-6 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                    </div>
                  )}

                  {/* ── Delete button — always visible ── */}
                  <button
                    onClick={() => handleDelete(img)}
                    disabled={deletingId === img.id}
                    title="Delete image"
                    aria-label={`Delete "${img.caption}"`}
                    className="absolute top-2 right-2 z-10
                      flex items-center gap-1 px-2 py-1 rounded-lg
                      bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold
                      shadow-lg shadow-red-900/40
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-150"
                  >
                    {deletingId === img.id ? (
                      <span className="text-[10px]">…</span>
                    ) : (
                      <>
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3" aria-hidden>
                          <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66H14.5a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92H4.885a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                        </svg>
                        حذف
                      </>
                    )}
                  </button>
                </div>

                {/* ── Always-visible caption bar ── */}
                <div className="px-3 pt-2 pb-2.5 flex flex-col gap-0.5 bg-[#0f1117]">
                  <p className="text-white text-xs font-semibold leading-tight line-clamp-1">
                    {img.caption}
                  </p>
                  <p className="text-slate-500 text-[10px] line-clamp-1">{img.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
