"use client";

import { useState, useEffect } from "react";
import { Briefcase, Filter } from "lucide-react";
import toast from "react-hot-toast";

import { SearchBar } from "@/components/JobSearch/SearchBar";
import { JobCardGrid } from "@/components/JobSearch/JobCardGrid";
import { searchJobs, upsertApplication, getApplications } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { Job } from "@/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

type FilterType = "all" | "high" | "tracked";

export default function JobsPage() {
  const cvId = useAppStore((s) => s.cvId);

  // Search and load states
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tracking states
  const [trackedJobIds, setTrackedJobIds] = useState<Set<string>>(new Set());
  const [trackLoadingId, setTrackLoadingId] = useState<string | null>(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Fetch already tracked jobs on mount to prevent double tracking
  useEffect(() => {
    async function loadTrackedJobs() {
      try {
        const apps = await getApplications();
        const trackedIds = new Set<string>();
        apps.forEach((app) => {
          if (app.job_id) trackedIds.add(app.job_id);
        });
        setTrackedJobIds(trackedIds);
      } catch (err) {
        console.error("Failed to load tracked jobs:", err);
      }
    }
    loadTrackedJobs();
  }, []);

  // ─── Search Handlers ────────────────────────────────────────────────────────

  const handleSearch = async (q: string, location: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setActiveFilter("all"); // Reset filter on new search

    try {
      const response = await searchJobs(q, location, cvId);
      setJobs(response.jobs);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to fetch jobs. Please try again.");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Tracking Handlers ──────────────────────────────────────────────────────

  const handleTrack = async (job: Job) => {
    setTrackLoadingId(job.id);
    try {
      await upsertApplication({
        job_title: job.title,
        company: job.company,
        location: job.location,
        deadline: job.deadline,
        status: "applied",
        job_id: job.id,
        fit_score: job.fit_score,
      });

      // Update state
      setTrackedJobIds((prev) => {
        const next = new Set(prev);
        next.add(job.id);
        return next;
      });

      toast.success(`Tracking ${job.title} at ${job.company}!`);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Could not track job. Please try again.");
    } finally {
      setTrackLoadingId(null);
    }
  };

  // ─── Client-Side Filtering ──────────────────────────────────────────────────

  const highFitJobs = jobs.filter(
    (job) => job.fit_score !== null && job.fit_score >= 75
  );
  
  const trackedJobs = jobs.filter((job) => trackedJobIds.has(job.id));

  const filteredJobs = jobs.filter((job) => {
    if (activeFilter === "high") {
      return job.fit_score !== null && job.fit_score >= 75;
    }
    if (activeFilter === "tracked") {
      return trackedJobIds.has(job.id);
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Job Hunter</h1>
        <p className="mt-1 text-sm text-muted">
          Search job postings and see AI-guided fit recommendations based on your CV.
        </p>
      </div>

      {/* Search Input Bar */}
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {/* Results Section */}
      {hasSearched ? (
        <div className="space-y-6">
          {/* Filter Chips */}
          {!isLoading && jobs.length > 0 && (
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted mr-2">
                  <Filter className="h-3.5 w-3.5" />
                  Filter results
                </span>

                {/* Filter Chip: All */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-150",
                    activeFilter === "all"
                      ? "bg-brand-600 border-brand-600 text-white shadow-sm shadow-brand-500/10"
                      : "bg-surface border-border text-muted hover:border-brand-500 hover:text-foreground"
                  )}
                >
                  All ({jobs.length})
                </button>

                {/* Filter Chip: High Fit */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("high")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-150",
                    activeFilter === "high"
                      ? "bg-green-600 border-green-600 text-white shadow-sm"
                      : "bg-surface border-border text-muted hover:border-green-500 hover:text-foreground"
                  )}
                >
                  High Fit (≥75%) ({highFitJobs.length})
                </button>

                {/* Filter Chip: Tracked */}
                <button
                  type="button"
                  onClick={() => setActiveFilter("tracked")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-150",
                    activeFilter === "tracked"
                      ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                      : "bg-surface border-border text-muted hover:border-brand-500 hover:text-foreground"
                  )}
                >
                  Tracked ({trackedJobs.length})
                </button>
              </div>

              <span className="text-xs text-muted">
                Showing {filteredJobs.length} of {jobs.length} jobs
              </span>
            </div>
          )}

          {/* Grid Render */}
          <JobCardGrid
            jobs={filteredJobs}
            isLoading={isLoading}
            onTrack={handleTrack}
            trackedJobIds={trackedJobIds}
            trackLoadingId={trackLoadingId}
          />
        </div>
      ) : (
        /* On mount empty/initial prompt state */
        <EmptyState
          icon={Briefcase}
          title="Find your next career step"
          description="Type a job role and location in the search bar above to fetch listings and compute personalized AI fit scores."
        />
      )}
    </div>
  );
}
