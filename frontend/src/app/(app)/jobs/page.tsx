"use client";

import { useState } from "react";
import { searchJobs } from "@/lib/api";
import type { Job } from "@/types";

function FitBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="cp-badge" style={{ background: "rgba(100,116,139,0.15)", color: "var(--cp-text-dim)" }}>—</span>;
  const color = score >= 75 ? "var(--cp-success)" : score >= 50 ? "var(--cp-warning)" : "var(--cp-danger)";
  const bg = score >= 75 ? "rgba(34,197,94,0.15)" : score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
  return <span className="cp-badge font-bold" style={{ background: bg, color }}>{score}%</span>;
}

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="cp-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 mr-4">
          <h3 className="font-semibold text-base">{job.title}</h3>
          <p className="text-sm" style={{ color: "var(--cp-text-muted)" }}>{job.company} · {job.location}</p>
        </div>
        <FitBadge score={job.fit_score} />
      </div>
      {(job.salary_min || job.salary_max) && (
        <p className="text-sm mb-2" style={{ color: "var(--cp-accent)" }}>
          {job.currency || "$"}{job.salary_min?.toLocaleString() || "?"} – {job.salary_max?.toLocaleString() || "?"}
        </p>
      )}
      {job.deadline && (
        <p className="text-xs mb-3" style={{ color: "var(--cp-text-dim)" }}>Deadline: {job.deadline}</p>
      )}
      {job.fit_reasons.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--cp-success)" }}>✓ Fit reasons</p>
          <ul className="text-xs list-disc ml-4" style={{ color: "var(--cp-text-muted)" }}>
            {job.fit_reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {job.gap_reasons.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-1" style={{ color: "var(--cp-warning)" }}>⚠ Gaps</p>
          <ul className="text-xs list-disc ml-4" style={{ color: "var(--cp-text-muted)" }}>
            {job.gap_reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      <div className="flex items-center gap-3 mt-auto">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="cp-btn cp-btn-primary text-xs px-3 py-1.5">
          Apply ↗
        </a>
        <button onClick={() => setExpanded(!expanded)} className="cp-btn cp-btn-ghost text-xs px-3 py-1.5">
          {expanded ? "Less" : "More"}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 rounded-lg p-3 text-sm leading-relaxed"
          style={{ background: "var(--cp-surface-2)", color: "var(--cp-text-muted)" }}>
          {job.description?.slice(0, 500)}…
        </div>
      )}
    </div>
  );
}

import { useAppStore } from "@/store/useAppStore";

export default function JobsPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("bd");
  const [searched, setSearched] = useState(false);
  const cvId = useAppStore((s) => s.cvId);
  const jobs = useAppStore((s) => s.jobs);
  const jobsLoading = useAppStore((s) => s.jobsLoading);
  const setJobs = useAppStore((s) => s.setJobs);
  const setJobsLoading = useAppStore((s) => s.setJobsLoading);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setJobsLoading(true);
    try {
      const results = await searchJobs(query, location, cvId || undefined);
      setJobs(results);
    } catch {
      setJobs([]);
    }
    setJobsLoading(false);
    setSearched(true);
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Job Hunter</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Search live jobs with AI-powered fit scores</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="cp-card mb-8 flex flex-col md:flex-row gap-4">
        <input
          className="cp-input flex-1"
          placeholder="e.g. React developer, ML engineer, Data analyst..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="cp-input w-full md:w-40"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="bd">Bangladesh</option>
          <option value="gb">United Kingdom</option>
          <option value="us">United States</option>
          <option value="in">India</option>
          <option value="remote">Remote</option>
        </select>
        <button type="submit" className="cp-btn cp-btn-primary whitespace-nowrap" disabled={jobsLoading}>
          {jobsLoading ? "Searching…" : "🔍 Search"}
        </button>
      </form>

      {/* Results */}
      {jobsLoading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
        </div>
      )}
      {!jobsLoading && searched && jobs.length === 0 && (
        <div className="cp-card text-center py-12">
          <p className="text-xl mb-2">No jobs found</p>
          <p style={{ color: "var(--cp-text-muted)" }}>Try different keywords or location</p>
        </div>
      )}
      {!jobsLoading && jobs.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
