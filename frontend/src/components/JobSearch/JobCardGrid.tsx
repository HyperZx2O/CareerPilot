"use client";

import { Briefcase } from "lucide-react";
import type { Job } from "@/types";
import { JobCard } from "@/components/JobSearch/JobCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface JobCardGridProps {
  jobs: Job[];
  isLoading: boolean;
  onTrack: (job: Job) => void;
  trackedJobIds: Set<string>;
  trackLoadingId: string | null;
}

export function JobCardGrid({
  jobs,
  isLoading,
  onTrack,
  trackedJobIds,
  trackLoadingId,
}: JobCardGridProps) {
  // ── Loading Skeleton State ──
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 animate-pulse space-y-5"
          >
            <div className="space-y-3">
              {/* Title & Badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-3/4 rounded bg-border" />
                  <div className="h-4 w-1/2 rounded bg-border" />
                </div>
                <div className="h-12 w-14 rounded-xl bg-border shrink-0" />
              </div>
              {/* Metadata */}
              <div className="flex gap-4 border-t border-border/40 pt-4">
                <div className="h-3 w-24 rounded bg-border" />
                <div className="h-3 w-28 rounded bg-border" />
              </div>
              {/* Description */}
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full rounded bg-border" />
                <div className="h-3 w-5/6 rounded bg-border" />
              </div>
            </div>
            {/* Actions */}
            <div className="flex justify-between border-t border-border/40 pt-4">
              <div className="h-9 w-32 rounded-xl bg-border" />
              <div className="h-9 w-28 rounded-xl bg-border" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Empty State ──
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs found"
        description="Try searching with a different job title, keyword, or location."
      />
    );
  }

  // ── Grid Render ──
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onTrack={onTrack}
          isTracking={trackedJobIds.has(job.id)}
          isTrackLoading={trackLoadingId === job.id}
        />
      ))}
    </div>
  );
}
