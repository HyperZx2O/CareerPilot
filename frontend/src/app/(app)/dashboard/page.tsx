"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import StatsGrid from "@/components/Dashboard/StatsGrid";
import RecentApplications from "@/components/Dashboard/RecentApplications";
import UpcomingDeadlines from "@/components/Dashboard/UpcomingDeadlines";
import AICard from "@/components/Dashboard/AICard";
import { getDashboardStats, getApplications, getNudge } from "@/lib/api";
import type { DashboardStats, Application, Job } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock cvId or fetch from localStorage
      let cvId = "";
      if (typeof window !== "undefined") {
        cvId = localStorage.getItem("cv_id") || "mock-cv-123";
      }

      // Fetch in parallel using Promise.all
      const [statsData, appsData, nudgeData] = await Promise.all([
        getDashboardStats(cvId),
        getApplications(),
        getNudge(cvId),
      ]);

      setStats(statsData);
      setApplications(appsData);
      setNudgeMessage(nudgeData.message);
      setRecommendedJobs(nudgeData.jobs);
    } catch {
      toast.error("Failed to load dashboard statistics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handler passed to AICard when a job gets tracked to update stats & list in real-time
  const handleJobTracked = async () => {
    try {
      // Re-fetch everything to keep layout sync'd up
      const cvId = typeof window !== "undefined" ? localStorage.getItem("cv_id") || "mock-cv-123" : "mock-cv-123";
      const [statsData, appsData] = await Promise.all([
        getDashboardStats(cvId),
        getApplications(),
      ]);
      setStats(statsData);
      setApplications(appsData);
    } catch {
      // Fail silently for background refreshes
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Your career search progress, active pipelines, and upcoming milestones at a glance.
          </p>
        </div>

        {!isLoading && (
          <button
            onClick={fetchDashboardData}
            aria-label="Refresh dashboard data"
            className="inline-flex items-center justify-center p-2 rounded-xl border border-border bg-surface text-muted hover:text-foreground active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {/* Stats Skeletons */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl border border-border bg-surface/50 animate-pulse"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Assistant skeleton */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/50 h-[340px] animate-pulse" />
            {/* Right side widgets skeletons */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-border bg-surface/50 h-[190px] animate-pulse" />
              <div className="rounded-2xl border border-border bg-surface/50 h-[190px] animate-pulse" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid metrics */}
          {stats && <StatsGrid stats={stats} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Assistant grounded recommendation card */}
            <div className="lg:col-span-2">
              <AICard
                nudgeMessage={nudgeMessage}
                recommendedJobs={recommendedJobs}
                onJobTracked={handleJobTracked}
              />
            </div>

            {/* Timelines and lists */}
            <div className="flex flex-col gap-6">
              <UpcomingDeadlines applications={applications} />
              <RecentApplications applications={applications} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
