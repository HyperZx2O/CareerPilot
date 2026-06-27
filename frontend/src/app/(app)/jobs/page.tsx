/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail · theme: Cobalt
 * section head: S4 inline · feature: F3 tabular spec sheet · CTA: C1 outlined chip
 */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchJobs, apiFetch } from "@/lib/api";
import type { Job } from "@/types";
import { Search, MapPin, DollarSign, Calendar, ExternalLink, Sparkles, FileText, AlertTriangle, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

function FitBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--color-text-dim) 15%, transparent)", color: "var(--color-text-dim)" }}>
        —
      </span>
    );
  }
  const color = score >= 75 ? "var(--color-success)" : "var(--color-accent)";
  const bg = score >= 75
    ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
    : "color-mix(in srgb, var(--color-accent) 15%, transparent)";
  return (
    <motion.span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
      style={{ background: bg, color }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
    >
      {score}%
    </motion.span>
  );
}

function JobRow({ job, index, onCoverLetter }: { job: Job; index: number; onCoverLetter: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="border-b px-5 py-4 transition-all last:border-b-0"
      style={{ borderColor: "var(--color-border)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{job.title}</h3>
            <FitBadge score={job.fit_score} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" style={{ color: "var(--color-text-dim)" }} />
              {job.company} · {job.location}
            </span>
            {(job.salary_min || job.salary_max) && (
              <span className="flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
                <DollarSign className="h-3 w-3" />
                {job.currency || "$"}{job.salary_min?.toLocaleString() || "?"} – {job.salary_max?.toLocaleString() || "?"}
              </span>
            )}
            {job.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" style={{ color: "var(--color-text-dim)" }} />
                {job.deadline}
              </span>
            )}
          </div>
          {job.fit_reasons.length > 0 && !expanded && (
            <p className="mt-1.5 truncate text-xs" style={{ color: "var(--color-success)" }}>
              <Sparkles className="mr-0.5 inline h-3 w-3" />{job.fit_reasons[0]}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <motion.a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "var(--color-accent)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Apply
            <ExternalLink className="ml-1 inline h-3 w-3" />
          </motion.a>
          <motion.button
            onClick={onCoverLetter}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileText className="mr-1 inline h-3 w-3" />
            Letter
          </motion.button>
          <motion.button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg px-2 py-1.5 text-xs"
            style={{ color: "var(--color-text-dim)" }}
            whileHover={{ scale: 1.05 }}
          >
            {expanded ? "Less" : "More"}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
              {job.fit_reasons.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-success)" }}>Fit reasons</p>
                  <ul className="ml-4 list-disc space-y-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {job.fit_reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {job.gap_reasons.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold" style={{ color: "var(--color-accent)" }}>Gaps</p>
                  <ul className="ml-4 list-disc space-y-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {job.gap_reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {job.description && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-dim)" }}>
                  {job.description.slice(0, 500)}{job.description.length > 500 && "…"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CoverLetterPanel({ job, onClose }: { job: Job; onClose: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ cover_letter: string }>(
        `/api/jobs/${job.id}/cover-letter`,
        { method: "POST", body: { job_title: job.title, company: job.company, description: job.description } }
      );
      setText(res.cover_letter);
    } catch (err: any) {
      setError(err.message || "Failed to generate");
    }
    setLoading(false);
  }

  return (
    <motion.div
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg border-l shadow-lg"
      style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex w-full flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Cover Letter</h2>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{job.title} · {job.company}</p>
          </div>
          <motion.button onClick={onClose} className="rounded-lg p-2" whileHover={{ scale: 1.1 }} style={{ color: "var(--color-text-dim)" }}>
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!text && !loading && !error && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <FileText className="h-10 w-10" style={{ color: "var(--color-text-dim)" }} strokeWidth={1.5} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Generate a tailored cover letter for this role</p>
              <motion.button
                onClick={handleGenerate}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--color-accent)" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles className="mr-2 inline h-4 w-4" />
                Generate
              </motion.button>
            </div>
          )}
          {loading && (
            <div className="flex h-full items-center justify-center">
              <motion.div
                className="h-8 w-8 rounded-full border-2"
                style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          )}
          {error && (
            <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-paper))" }}>
              <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
            </div>
          )}
          {text && (
            <textarea
              className="w-full rounded-xl border bg-[var(--color-paper-2)] p-4 text-sm leading-relaxed outline-none"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)", minHeight: "300px" }}
              value={text}
              readOnly
            />
          )}
        </div>

        {text && (
          <div className="border-t px-5 py-4" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex gap-3">
              <motion.button
                onClick={() => navigator.clipboard.writeText(text)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--color-accent)" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Copy
              </motion.button>
              <motion.button
                onClick={onClose}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("bd");
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localJobs, setLocalJobs] = useState<Job[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const setJobs = useAppStore((s) => s.setJobs);
  const setJobsLoading = useAppStore((s) => s.setJobsLoading);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearched(true);
    setLocalLoading(true);
    setLocalJobs([]);
    setError(null);
    try {
      const results = await searchJobs(query, location);
      setLocalJobs(results);
      setJobs(results);
    } catch (err: any) {
      setError(err.message || "Failed to search jobs");
      setLocalJobs([]);
      setJobs([]);
    }
    setLocalLoading(false);
    setJobsLoading(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>Job Hunter</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Search live jobs with AI-powered fit scores</p>
      </div>

      {/* Search banner */}
      <motion.form
        onSubmit={handleSearch}
        className="mb-6 overflow-hidden rounded-xl border"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-dim)" }} />
            <input
              className="w-full rounded-xl border bg-[var(--color-paper-2)] px-4 py-2.5 pl-9 text-sm outline-none transition-all focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              placeholder="e.g. React developer, ML engineer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border bg-[var(--color-paper-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="bd">BD · Bangladesh</option>
            <option value="gb">GB · United Kingdom</option>
            <option value="us">US · United States</option>
            <option value="in">IN · India</option>
            <option value="remote">Remote</option>
          </select>
          <motion.button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
            disabled={localLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {localLoading ? (
              <motion.div className="h-4 w-4 rounded-full border-2 border-t-transparent" style={{ borderColor: "white", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
            ) : (
              "Search"
            )}
          </motion.button>
        </div>
      </motion.form>

      {!localLoading && error && (
        <motion.div className="mb-6 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-paper))", color: "var(--color-accent)" }}>
          <AlertTriangle className="mr-2 inline h-4 w-4" />{error}
        </motion.div>
      )}

      {localLoading && (
        <div className="flex h-40 items-center justify-center">
          <motion.div className="h-10 w-10 rounded-full border-4" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
        </div>
      )}

      {!localLoading && !error && searched && localJobs.length === 0 && (
        <motion.div className="flex flex-col items-center justify-center rounded-xl border py-16" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
          <Search className="mb-3 h-10 w-10" style={{ color: "var(--color-text-dim)" }} strokeWidth={1.5} />
          <p className="mb-1 text-base font-semibold" style={{ color: "var(--color-text)" }}>No jobs found</p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Try different keywords or location</p>
        </motion.div>
      )}

      {!localLoading && localJobs.length > 0 && (
        <motion.div className="overflow-hidden rounded-xl border" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
          <div className="border-b px-5 py-3" style={{ borderColor: "var(--color-border)" }}>
            <span className="mr-1 text-sm font-semibold tabular-nums" style={{ color: "var(--color-text)" }}>{localJobs.length}</span>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>matches found</span>
          </div>
          {localJobs.map((job, i) => (
            <JobRow key={job.id} job={job} index={i} onCoverLetter={() => setCoverLetterJob(job)} />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {coverLetterJob && (
          <CoverLetterPanel job={coverLetterJob} onClose={() => setCoverLetterJob(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
