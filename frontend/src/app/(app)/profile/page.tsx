/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail · theme: Cobalt
 * section head: S2 hanging · feature: F6 product card grid · CTA: C3 typographic
 */
"use client";

import { useAppStore } from "@/store/useAppStore";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ErrorOverlay from "@/components/ui/ErrorOverlay";
import { uploadCV, getCVSections, deleteCV } from "@/lib/api";
import { Upload, FileText, CheckCircle, AlertCircle, Briefcase, GraduationCap, Brain, Sparkles, X, Trash2 } from "lucide-react";

interface CVSection {
  section: string;
  content: string;
}

const sectionIcons: Record<string, JSX.Element> = {
  experience: <Briefcase className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  skills: <Brain className="h-4 w-4" />,
};

export default function ProfilePage() {
  const cvId = useAppStore((s) => s.cvId);
  const setCvId = useAppStore((s) => s.setCvId);

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ cv_id: string; status: string } | null>(cvId ? { cv_id: cvId, status: "completed" } : null);
  const [error, setError] = useState<string | null>(null);
  const [cvSections, setCvSections] = useState<CVSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cvId) {
      setLoadingSections(true);
      getCVSections(cvId).then((data) => { if (data.sections && data.sections.length > 0) setCvSections(data.sections); }).catch(() => {}).finally(() => setLoadingSections(false));
    }
  }, [cvId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { setError("Only PDF and DOCX files are supported."); return; }
    setUploading(true);
    setError(null);
    setCvSections([]);
    try {
      const res = await uploadCV(file);
      setUploadResult(res);
      setCvId(res.cv_id);
      pollForSections(res.cv_id);
    } catch { setError("Upload failed. Please try again."); }
    setUploading(false);
  }

  function pollForSections(id: string, attempts = 0) {
    if (attempts >= 30) return;
    getCVSections(id).then((data) => { if (data.sections && data.sections.length > 0) { setCvSections(data.sections); return; } }).catch(() => {});
    setTimeout(() => pollForSections(id, attempts + 1), 1000);
  }

  async function handleDeleteCV() {
    if (!uploadResult?.cv_id) return;
    try {
      await deleteCV(uploadResult.cv_id);
      useAppStore.setState({ cvId: null });
      setUploadResult(null);
      setCvSections([]);
      setError(null);
    } catch { setError("Failed to delete CV"); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>Profile</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Upload your CV and view parsed sections</p>
      </div>

      {/* Upload banner */}
      <motion.div className="mb-8 overflow-hidden rounded-xl border" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
        <div className="p-6">
          <motion.div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center gap-5 rounded-xl border-2 border-dashed p-8 transition-all"
            style={{ borderColor: uploading ? "var(--color-accent)" : "var(--color-border)", background: uploading ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-paper))" : "var(--color-paper-2)" }}
            whileHover={{ borderColor: "var(--color-accent)" }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }} animate={uploading ? { rotate: 360 } : {}} transition={uploading ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}>
              {uploading ? <motion.div className="h-6 w-6 rounded-full border-3 border-t-transparent" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} /> : <Upload className="h-6 w-6" style={{ color: "var(--color-accent)" }} />}
            </motion.div>
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--color-text)" }}>{uploading ? "Processing…" : "Drop your CV here or click to browse"}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>Supports PDF and DOCX files</p>
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div className="mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-paper))" }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <AlertCircle className="h-3.5 w-3.5" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {uploadResult && (
              <motion.div className="mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--color-success)", color: "var(--color-success)", background: "color-mix(in srgb, var(--color-success) 8%, var(--color-paper))" }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="flex-1">CV uploaded</span>
                <motion.button onClick={handleDeleteCV} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium" style={{ color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 10%, transparent)" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Trash2 className="h-3 w-3" />Delete
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Parsed sections */}
      <motion.div className="rounded-xl border" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
        <div className="p-6">
          <header className="head-hang mb-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
              Parsed CV Sections
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              After uploading, your CV is chunked by section and embedded for AI-powered analysis.
            </p>
          </header>

          <AnimatePresence>
            {loadingSections && (
              <motion.div className="mb-4 flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="h-4 w-4 rounded-full border-2" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Processing CV...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-3 md:grid-cols-2">
            {cvSections.length > 0 ? cvSections.map((sec, i) => {
              const isExpanded = expandedSection === i;
              const content = sec.content;
              const isLong = content.length > 200;
              return (
                <motion.div
                  key={i}
                  className="overflow-hidden rounded-xl border transition-all"
                  style={{ background: "var(--color-paper-2)", borderColor: "var(--color-border)" }}
                  layout
                >
                  <div className="flex items-start justify-between gap-2 p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}>
                        {sectionIcons[sec.section] || <Sparkles className="h-4 w-4" style={{ color: "var(--color-accent)" }} />}
                      </span>
                      <h3 className="text-sm font-medium capitalize">{sec.section}</h3>
                    </div>
                    {isLong && (
                      <motion.button
                        onClick={() => setExpandedSection(isExpanded ? null : i)}
                        className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                        style={{ color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 10%, transparent)" }}
                        whileHover={{ scale: 1.05 }}
                      >
                        {isExpanded ? "Less" : "More"}
                      </motion.button>
                    )}
                  </div>
                  <div className="px-4 pb-4">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed" style={{ color: "var(--color-text)" }}>
                      {isLong && !isExpanded ? content.substring(0, 200) + "…" : content}
                    </p>
                  </div>
                </motion.div>
              );
            }) : !loadingSections && (
              <motion.div className="col-span-2 flex flex-col items-center justify-center py-12" style={{ color: "var(--color-text-dim)" }}>
                <FileText className="mb-3 h-10 w-10" strokeWidth={1.5} />
                <p className="text-sm">Upload a CV to see parsed sections here</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
      <ErrorOverlay error={error} onDismiss={() => setError(null)} />
    </motion.div>
  );
}
