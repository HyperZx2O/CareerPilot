"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  DollarSign,
  Calendar,
  Briefcase,
  Plus,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { Job } from "@/types";
import { formatDate, formatSalary, getFitLevel } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onTrack: (job: Job) => void;
  isTracking: boolean;
  isTrackLoading?: boolean;
}

export function JobCard({
  job,
  onTrack,
  isTracking,
  isTrackLoading = false,
}: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fitLevel = getFitLevel(job.fit_score);

  // Fit score badge style selectors
  const badgeColors = {
    high: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/60",
    medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/60",
    low: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/60",
    unknown: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-850/30 dark:text-gray-400 dark:border-gray-800",
  };

  const badgeBorder = badgeColors[fitLevel];

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:border-brand-500/30 hover:shadow-md hover:shadow-brand-500/5">
      <div className="space-y-4">
        {/* Header: Title & Fit Score */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold leading-snug text-foreground group-hover:text-brand-600 transition-colors">
              {job.title}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted">{job.company}</span>
              <span className="text-xs text-muted/60">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            </div>
          </div>

          {/* Fit Score Badge */}
          <div
            className={`flex shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-1.5 text-center ${badgeBorder}`}
          >
            <span className="text-xs font-medium uppercase tracking-wider opacity-80">
              Fit Score
            </span>
            <span className="text-lg font-extrabold leading-none mt-0.5">
              {job.fit_score !== null ? `${job.fit_score}%` : "—"}
            </span>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatSalary(job.salary_min, job.salary_max, job.currency)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>Apply by: {formatDate(job.deadline)}</span>
          </div>
        </div>

        {/* Description Snippet */}
        <p className="text-sm text-muted/80 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Collapsible details toggle */}
        {job.fit_score !== null && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
              aria-expanded={isExpanded}
              aria-controls={`fit-analysis-${job.id}`}
            >
              {isExpanded ? (
                <>
                  <span>Hide fit analysis</span>
                  <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>Why this score?</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {/* Collapsible details container */}
            {isExpanded && (
              <div
                id={`fit-analysis-${job.id}`}
                className="space-y-3.5 rounded-xl bg-background p-4 border border-border animate-fade-in text-xs"
              >
                {/* CV Matches */}
                {job.fit_reasons.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider text-[10px]">
                      Match Highlights
                    </p>
                    <ul className="space-y-1.5">
                      {job.fit_reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CV Gaps */}
                {job.gap_reasons && job.gap_reasons.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <p className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider text-[10px]">
                      Potential Gaps
                    </p>
                    <ul className="space-y-1.5">
                      {job.gap_reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-muted">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 border-t border-border/60 pt-4 flex items-center justify-between">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:bg-surface hover:text-brand-600"
        >
          <Briefcase className="h-3.5 w-3.5" />
          View full posting
        </a>

        {isTracking ? (
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-xs font-semibold text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400 cursor-default"
          >
            <Check className="h-3.5 w-3.5" />
            Added ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onTrack(job)}
            disabled={isTrackLoading}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-500/10 transition-all hover:bg-brand-700 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            {isTrackLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Track this job
          </button>
        )}
      </div>
    </article>
  );
}
