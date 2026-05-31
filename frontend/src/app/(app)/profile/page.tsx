"use client";

import { useAppStore } from "@/store/useAppStore";
import { useState, useRef, useEffect } from "react";
import { uploadCV, getCVSections } from "@/lib/api";

interface CVSection {
  section: string;
  content: string;
}

export default function ProfilePage() {
  const cvId = useAppStore((s) => s.cvId);
  const setCvId = useAppStore((s) => s.setCvId);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ cv_id: string; status: string } | null>(
    cvId ? { cv_id: cvId, status: "completed" } : null
  );
  const [error, setError] = useState<string | null>(null);
  const [cvSections, setCvSections] = useState<CVSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch CV sections when cvId is available
  useEffect(() => {
    if (cvId) {
      fetchSections(cvId);
    }
  }, [cvId]);

  async function fetchSections(id: string) {
    setLoadingSections(true);
    try {
      const data = await getCVSections(id);
      if (data.sections && data.sections.length > 0) {
        setCvSections(data.sections);
      }
    } catch (e) {
      console.error("Failed to fetch CV sections:", e);
    }
    setLoadingSections(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      setError("Only PDF and DOCX files are supported.");
      return;
    }

    setUploading(true);
    setError(null);
    setCvSections([]);
    try {
      const res = await uploadCV(file);
      setUploadResult(res);
      setCvId(res.cv_id);
      // Poll for sections after upload
      pollForSections(res.cv_id);
    } catch {
      setError("Upload failed. Please try again.");
    }
    setUploading(false);
  }

  async function pollForSections(id: string, attempts = 0) {
    if (attempts >= 10) return; // Max 10 attempts (10 seconds)
    try {
      const data = await getCVSections(id);
      if (data.sections && data.sections.length > 0) {
        setCvSections(data.sections);
        return;
      }
    } catch (e) {
      console.error("Polling for sections:", e);
    }
    // Retry after 1 second
    setTimeout(() => pollForSections(id, attempts + 1), 1000);
  }

  return (
    <div className="animate-slide-up max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Profile</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Upload your CV and view parsed sections</p>
      </div>

      {/* Upload zone */}
      <div className="cp-card mb-8">
        <h2 className="font-semibold mb-4">CV Upload</h2>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors"
          style={{
            borderColor: uploading ? "var(--cp-primary)" : "var(--cp-border)",
            background: uploading ? "var(--cp-primary-glow)" : "var(--cp-surface-2)",
          }}
        >
          <span className="text-4xl mb-3">📄</span>
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
              <span>Processing…</span>
            </div>
          ) : (
            <>
              <p className="font-medium mb-1">Drop your CV here or click to browse</p>
              <p className="text-sm" style={{ color: "var(--cp-text-muted)" }}>
                Supports PDF and DOCX files
              </p>
            </>
          )}
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border p-3 text-sm"
            style={{ borderColor: "var(--cp-danger)", color: "var(--cp-danger)", background: "rgba(239,68,68,0.1)" }}>
            {error}
          </div>
        )}

        {uploadResult && (
          <div className="mt-4 rounded-lg border p-3 text-sm animate-fade-in"
            style={{ borderColor: "var(--cp-success)", color: "var(--cp-success)", background: "rgba(34,197,94,0.1)" }}>
            ✅ CV uploaded! ID: <code className="text-xs">{uploadResult.cv_id}</code> — Status: {uploadResult.status}
          </div>
        )}
      </div>

      {/* Parsed sections preview */}
      <div className="cp-card">
        <h2 className="font-semibold mb-4">Parsed CV Sections</h2>
        <p className="text-sm mb-4" style={{ color: "var(--cp-text-muted)" }}>
          After uploading, your CV is chunked by section and embedded for AI-powered analysis.
        </p>
        {loadingSections && (
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
            <span className="text-sm" style={{ color: "var(--cp-text-muted)" }}>Processing CV...</span>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {cvSections.length > 0 ? (
            cvSections.map((sec, i) => (
              <div key={i} className="rounded-lg border p-4"
                style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    style={{ background: "rgba(99,102,241,0.15)" }}>
                    {sec.section === "experience" ? "💼" : sec.section === "education" ? "🎓" : sec.section === "skills" ? "🧠" : "🚀"}
                  </span>
                  <h3 className="font-medium text-sm capitalize">{sec.section}</h3>
                </div>
                <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--cp-text)" }}>
                  {sec.content.length > 200 ? sec.content.substring(0, 200) + "..." : sec.content}
                </p>
              </div>
            ))
          ) : !loadingSections && (
            <div className="col-span-2 text-center py-8" style={{ color: "var(--cp-text-dim)" }}>
              <p>Upload a CV to see parsed sections here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
