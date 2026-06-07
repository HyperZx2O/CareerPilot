"use client";

import { useAppStore } from "@/store/useAppStore";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadCV, getCVSections } from "@/lib/api";
import { Upload, FileText, CheckCircle, AlertCircle, Briefcase, GraduationCap, Brain, Sparkles } from "lucide-react";

interface CVSection {
  section: string;
  content: string;
}

const sectionIcons: Record<string, JSX.Element> = {
  experience: <Briefcase className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  skills: <Brain className="h-4 w-4" />,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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

  useEffect(() => {
    if (cvId) fetchSections(cvId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvId]);

  async function fetchSections(id: string) {
    setLoadingSections(true);
    try {
      const data = await getCVSections(id);
      if (data.sections && data.sections.length > 0) {
        setCvSections(data.sections);
      }
    } catch {
      // Silently handle fetch failure
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
      pollForSections(res.cv_id);
    } catch {
      setError("Upload failed. Please try again.");
    }
    setUploading(false);
  }

  async function pollForSections(id: string, attempts = 0) {
    if (attempts >= 10) return;
    try {
      const data = await getCVSections(id);
      if (data.sections && data.sections.length > 0) {
        setCvSections(data.sections);
        return;
      }
    } catch {
      // Silently handle polling failure
    }
    setTimeout(() => pollForSections(id, attempts + 1), 1000);
  }

  return (
    <motion.div
      className="max-w-3xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <motion.h1
          className="mb-1 text-3xl font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Profile
        </motion.h1>
        <motion.p
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Upload your CV and view parsed sections
        </motion.p>
      </motion.div>

      {/* Upload zone */}
      <motion.div
        className="mb-8 overflow-hidden rounded-2xl border"
        style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="p-6">
          <motion.h2
            className="mb-4 flex items-center gap-2 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FileText className="h-5 w-5" style={{ color: "var(--cp-primary)" }} />
            CV Upload
          </motion.h2>

          <motion.div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all"
            style={{
              borderColor: uploading ? "var(--cp-primary)" : "var(--cp-border)",
              background: uploading ? "var(--cp-primary-glow)" : "var(--cp-surface-2)",
            }}
            whileHover={{ scale: 1.01, borderColor: "var(--cp-primary)" }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.div
              className="mb-3"
              animate={uploading ? { rotate: 360 } : {}}
              transition={uploading ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
            >
              {uploading ? (
                <motion.div
                  className="h-12 w-12 rounded-full border-4 border-t-transparent"
                  style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }}
                />
              ) : (
                <Upload className="h-12 w-12" style={{ color: "var(--cp-text-dim)" }} />
              )}
            </motion.div>

            <AnimatePresence mode="wait">
              {uploading ? (
                <motion.div
                  key="uploading"
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="font-medium">Processing…</span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="mb-1 font-medium">Drop your CV here or click to browse</p>
                  <p className="text-sm" style={{ color: "var(--cp-text-muted)" }}>
                    Supports PDF and DOCX files
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm"
                style={{ borderColor: "var(--cp-danger)", color: "var(--cp-danger)", background: "rgba(239,68,68,0.1)" }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {uploadResult && (
              <motion.div
                className="mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm"
                style={{ borderColor: "var(--cp-success)", color: "var(--cp-success)", background: "rgba(34,197,94,0.1)" }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CheckCircle className="h-4 w-4" />
                CV uploaded! ID: <code className="text-xs">{uploadResult.cv_id}</code> — Status: {uploadResult.status}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Parsed sections preview */}
      <motion.div
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6">
          <motion.h2
            className="mb-2 flex items-center gap-2 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "var(--cp-accent)" }} />
            Parsed CV Sections
          </motion.h2>
          <motion.p
            className="mb-4 text-sm"
            style={{ color: "var(--cp-text-muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            After uploading, your CV is chunked by section and embedded for AI-powered analysis.
          </motion.p>

          <AnimatePresence>
            {loadingSections && (
              <motion.div
                className="mb-4 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="h-5 w-5 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-sm" style={{ color: "var(--cp-text-muted)" }}>Processing CV...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="grid gap-3 md:grid-cols-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {cvSections.length > 0 ? (
              cvSections.map((sec, i) => (
                <motion.div
                  key={i}
                  className="overflow-hidden rounded-xl border p-4 transition-all hover:border-indigo-500/50"
                  style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <motion.span
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: "rgba(99,102,241,0.15)" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, delay: i * 0.05 }}
                    >
                      {sectionIcons[sec.section] || <Sparkles className="h-4 w-4" />}
                    </motion.span>
                    <h3 className="text-sm font-medium capitalize">{sec.section}</h3>
                  </div>
                  <p className="whitespace-pre-wrap text-xs" style={{ color: "var(--cp-text)" }}>
                    {sec.content.length > 200 ? sec.content.substring(0, 200) + "…" : sec.content}
                  </p>
                </motion.div>
              ))
            ) : !loadingSections && (
              <motion.div
                className="col-span-2 py-8 text-center"
                style={{ color: "var(--cp-text-dim)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="mb-3 flex justify-center text-4xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                >
                  📄
                </motion.div>
                <p>Upload a CV to see parsed sections here</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
