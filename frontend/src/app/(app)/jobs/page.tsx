"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchJobs, apiFetch } from "@/lib/api";
import type { Job } from "@/types";
import { Search, MapPin, DollarSign, Calendar, ChevronDown, ChevronUp, ExternalLink, Sparkles, FileText } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function FitBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ background: "rgba(100,116,139,0.15)", color: "var(--cp-text-dim)" }}
      >
        —
      </span>
    );
  }

  const color =
    score >= 75
      ? "var(--cp-success)"
      : score >= 50
        ? "var(--cp-warning)"
        : "var(--cp-danger)";
  const bg =
    score >= 75
      ? "rgba(34, 197, 94, 0.15)"
      : score >= 50
        ? "rgba(245, 158, 11, 0.15)"
        : "rgba(239, 68, 68, 0.15)";

  return (
    <motion.span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: bg, color }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      {score}%
    </motion.span>
  );
}

function JobCard({ job, index }: { job: Job; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState("");
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);

  async function handleGenerateCoverLetter() {
    setCoverLetterLoading(true);
    setCoverLetterError(null);
    setCoverLetterText("");
    try {
      const res = await apiFetch<{ cover_letter: string }>(
        `/api/jobs/${job.id}/cover-letter`,
        {
          method: "POST",
          body: JSON.stringify({
            job_title: job.title,
            company: job.company,
            description: job.description,
          }),
        }
      );
      setCoverLetterText(res.cover_letter);
    } catch (err: any) {
      setCoverLetterError(err.message || "Failed to generate cover letter");
    }
    setCoverLetterLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
      }}
      className="group cursor-pointer overflow-hidden rounded-2xl border transition-all"
      style={{
        background: "var(--cp-surface)",
        borderColor: "var(--cp-border)",
      }}
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1 mr-4">
            <motion.h3
              className="font-semibold text-base"
              whileHover={{ color: "var(--cp-primary)" }}
            >
              {job.title}
            </motion.h3>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-3.5 w-3.5" style={{ color: "var(--cp-text-dim)" }} />
              <p className="text-sm" style={{ color: "var(--cp-text-muted)" }}>
                {job.company} · {job.location}
              </p>
            </div>
          </div>
          <FitBadge score={job.fit_score} />
        </div>

        {/* Salary */}
        {(job.salary_min || job.salary_max) && (
          <motion.div
            className="mb-3 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <DollarSign className="h-4 w-4" style={{ color: "var(--cp-accent)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--cp-accent)" }}>
              {job.currency || "$"}
              {job.salary_min?.toLocaleString() || "?"} – {job.salary_max?.toLocaleString() || "?"}
            </p>
          </motion.div>
        )}

        {/* Deadline */}
        {job.deadline && (
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-3.5 w-3.5" style={{ color: "var(--cp-text-dim)" }} />
            <p className="text-xs" style={{ color: "var(--cp-text-dim)" }}>
              Deadline: {job.deadline}
            </p>
          </div>
        )}

        {/* Fit reasons */}
        {job.fit_reasons.length > 0 && (
          <motion.div className="mb-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p
              className="mb-1 flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--cp-success)" }}
            >
              <Sparkles className="h-3 w-3" />
              Fit reasons
            </p>
            <ul
              className="ml-4 list-disc space-y-0.5 text-xs"
              style={{ color: "var(--cp-text-muted)" }}
            >
              {job.fit_reasons.map((r, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {r}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Gap reasons */}
        {job.gap_reasons.length > 0 && (
          <motion.div className="mb-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p
              className="mb-1 flex items-center gap-1 text-xs font-semibold"
              style={{ color: "var(--cp-warning)" }}
            >
              ⚠ Gaps
            </p>
            <ul
              className="ml-4 list-disc space-y-0.5 text-xs"
              style={{ color: "var(--cp-text-muted)" }}
            >
              {job.gap_reasons.map((r, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {r}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <motion.a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Apply
            <ExternalLink className="h-3.5 w-3.5" />
          </motion.a>
          <motion.button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:bg-indigo-500/10"
            style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {expanded ? "Less" : "More"}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </motion.button>
          <motion.button
            onClick={() => {
              setShowCoverLetter(true);
              if (!coverLetterText && !coverLetterLoading) {
                handleGenerateCoverLetter();
              }
            }}
            className="flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-medium transition-colors hover:bg-amber-500/10"
            style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText className="h-3.5 w-3.5" />
            Cover Letter
          </motion.button>
        </div>
      </div>

      {/* Expanded description */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div
              className="mx-5 mb-5 rounded-lg p-4 text-sm leading-relaxed"
              style={{
                background: "var(--cp-surface-2)",
                color: "var(--cp-text-muted)",
              }}
            >
              {job.description?.slice(0, 500)}
              {job.description && job.description.length > 500 && "…"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cover Letter Modal */}
      <AnimatePresence>
        {showCoverLetter && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCoverLetter(false);
            }}
          >
            <motion.div
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl border p-6"
              style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                <FileText className="h-5 w-5" />
                Cover Letter — {job.title}
              </h2>

              {coverLetterLoading && (
                <div className="flex h-48 items-center justify-center">
                  <motion.div
                    className="h-8 w-8 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}

              {coverLetterError && (
                <div
                  className="mb-4 rounded-xl border p-4 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    borderColor: "var(--cp-danger)",
                    color: "var(--cp-danger)",
                  }}
                >
                  {coverLetterError}
                </div>
              )}

              {coverLetterText && (
                <textarea
                  className="mb-4 w-full rounded-xl border bg-[var(--cp-surface-2)] p-4 text-sm leading-relaxed outline-none"
                  style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)", minHeight: "300px" }}
                  value={coverLetterText}
                  readOnly
                />
              )}

              <div className="flex gap-3">
                {coverLetterText && (
                  <motion.button
                    onClick={() => {
                      navigator.clipboard.writeText(coverLetterText);
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-sm font-semibold text-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Copy
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setShowCoverLetter(false)}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                  style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("bd");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cvId = useAppStore((s) => s.cvId);
  const jobs = useAppStore((s) => s.jobs);
  const jobsLoading = useAppStore((s) => s.jobsLoading);
  const setJobs = useAppStore((s) => s.setJobs);
  const setJobsLoading = useAppStore((s) => s.setJobsLoading);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearched(true);
    setJobsLoading(true);
    setJobs([]);
    setError(null);
    try {
      const results = await searchJobs(query, location, cvId || undefined);
      setJobs(results);
    } catch (err: any) {
      setError(err.message || "Failed to search jobs");
      setJobs([]);
    }
    setJobsLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="mb-8" variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { delay: 0.2 } },
      }}>
        <motion.h1
          className="mb-1 text-3xl font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Job Hunter
        </motion.h1>
        <motion.p
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Search live jobs with AI-powered fit scores
        </motion.p>
      </motion.div>

      {/* Search form */}
      <motion.form
        onSubmit={handleSearch}
        className="mb-8 overflow-hidden rounded-2xl border p-4"
        style={{
          background: "var(--cp-surface)",
          borderColor: "var(--cp-border)",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex flex-col gap-4 md:flex-row">
          <motion.div className="w-full md:flex-1" whileFocus={{ scale: 1.01 }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: "var(--cp-text-dim)" }} />
              <input
                className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-4 py-3 pl-10 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                style={{
                  borderColor: "var(--cp-border)",
                  color: "var(--cp-text)",
                }}
                placeholder="e.g. React developer, ML engineer, Data analyst..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </motion.div>
          <select
            className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 md:w-auto"
            style={{
              borderColor: "var(--cp-border)",
              color: "var(--cp-text)",
            }}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="bd">🇧🇩 Bangladesh</option>
            <option value="gb">🇬🇧 United Kingdom</option>
            <option value="us">🇺🇸 United States</option>
            <option value="in">🇮🇳 India</option>
            <option value="remote">🌐 Remote</option>
          </select>
          <motion.button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl disabled:opacity-50"
            disabled={jobsLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {jobsLoading ? (
              <>
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "white", borderTopColor: "transparent" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Searching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </motion.button>
        </div>
      </motion.form>

      {/* Error message */}
      {!jobsLoading && error && (
        <motion.div
          className="mb-6 rounded-xl border p-4 text-center"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "var(--cp-danger)",
            color: "var(--cp-danger)",
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium">Search failed</p>
          <p className="mt-1 text-sm opacity-80">{error}</p>
        </motion.div>
      )}

      {/* Loading spinner */}
      {jobsLoading && (
        <motion.div
          className="flex h-40 items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border-4 border-t-transparent"
            style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      )}

      {/* No jobs found */}
      {!jobsLoading && !error && searched && jobs.length === 0 && (
        <motion.div
          className="rounded-2xl border p-12 text-center"
          style={{
            background: "var(--cp-surface)",
            borderColor: "var(--cp-border)",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="mb-4 flex justify-center text-5xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            🔍
          </motion.div>
          <motion.p
            className="mb-2 text-xl font-semibold"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            No jobs found
          </motion.p>
          <motion.p
            style={{ color: "var(--cp-text-muted)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Try different keywords or location
          </motion.p>
        </motion.div>
      )}

      {!jobsLoading && jobs.length > 0 && (
        <motion.div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              transition: { staggerChildren: 0.05 },
            },
          }}
        >
          {jobs.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
