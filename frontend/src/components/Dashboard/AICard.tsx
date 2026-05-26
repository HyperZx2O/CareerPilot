"use client";

import React, { useState } from "react";
import { Sparkles, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Job } from "@/types";
import { upsertApplication } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AICardProps {
  nudgeMessage: string;
  recommendedJobs: Job[];
  onJobTracked?: () => Promise<void>;
}

export default function AICard({ nudgeMessage, recommendedJobs, onJobTracked }: AICardProps) {
  const [trackedIds, setTrackedIds] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const handleTrackJob = async (job: Job) => {
    setIsAdding((prev) => ({ ...prev, [job.id]: true }));
    try {
      await upsertApplication({
        job_title: job.title,
        company: job.company,
        location: job.location,
        deadline: job.deadline,
        status: "applied",
        fit_score: job.fit_score,
        notes: `Recommended by CareerPilot AI. Why this score: ${job.fit_reasons.join(", ")}`,
        job_id: job.id,
      });

      setTrackedIds((prev) => ({ ...prev, [job.id]: true }));
      toast.success(`Tracking "${job.title}" at ${job.company}!`);
      if (onJobTracked) {
        await onJobTracked();
      }
    } catch {
      toast.error("Failed to track job.");
    } finally {
      setIsAdding((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-surface/50 p-6 shadow-md dark:border-brand-900/40">
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 h-40 w-40 bg-brand-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-600 dark:bg-brand-950/20 dark:border-brand-900/40">
          <Sparkles className="h-4.5 w-4.5 animate-pulse" />
        </div>
        <h3 className="text-sm font-bold text-foreground">AI Career Assistant</h3>
        <span className="text-[10px] font-extrabold tracking-wider bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded-full uppercase ml-auto">
          Proactive Nudge
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-foreground/90 leading-relaxed font-medium mb-6">
        {nudgeMessage}
      </p>

      {/* Recommended Jobs */}
      {recommendedJobs.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
            Matching Job Opportunities
          </h4>

          <div className="space-y-3">
            {recommendedJobs.slice(0, 3).map((job) => {
              const isTracked = trackedIds[job.id];
              const isLoading = isAdding[job.id];
              const isExpanded = expandedJobId === job.id;

              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {job.title}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {job.company} • {job.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {job.fit_score !== null && (
                        <span
                          className={cn(
                            "inline-flex h-6 min-w-[36px] items-center justify-center rounded-md px-1.5 text-[10px] font-extrabold tracking-wider border",
                            job.fit_score >= 75
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/60 dark:text-emerald-400"
                              : "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/25 dark:border-amber-900/60 dark:text-amber-400"
                          )}
                        >
                          {job.fit_score}% Fit
                        </span>
                      )}

                      <button
                        onClick={() => handleTrackJob(job)}
                        disabled={isTracked || isLoading}
                        className={cn(
                          "inline-flex items-center gap-1 h-7 rounded-lg px-2.5 text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:scale-100 cursor-pointer disabled:pointer-events-none",
                          isTracked
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400"
                            : "bg-brand-600 hover:bg-brand-700 text-white"
                        )}
                      >
                        {isLoading ? (
                          "..."
                        ) : isTracked ? (
                          <>
                            <Check className="h-3 w-3" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            Track
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Collapse trigger */}
                  <button
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-muted hover:text-foreground cursor-pointer transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        Hide Analysis
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Why is this a good fit?
                      </>
                    )}
                  </button>

                  {/* Why this fit reasons */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/60 text-xs text-foreground space-y-2 animate-fade-in">
                      <div className="space-y-1">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Strengths (Match Reasons):
                        </p>
                        <ul className="list-disc pl-4 text-muted space-y-0.5">
                          {job.fit_reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                      {job.gap_reasons.length > 0 && (
                        <div className="space-y-1 pt-1.5">
                          <p className="font-semibold text-rose-600 dark:text-rose-400">
                            Potential Gaps:
                          </p>
                          <ul className="list-disc pl-4 text-muted space-y-0.5">
                            {job.gap_reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
