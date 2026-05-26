"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Briefcase } from "lucide-react";
import type { Application } from "@/types";
import { cn } from "@/lib/utils";

interface RecentApplicationsProps {
  applications: Application[];
}

export default function RecentApplications({ applications }: RecentApplicationsProps) {
  const recentApps = applications
    .slice()
    .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
    .slice(0, 5);

  const getStatusStyle = (status: Application["status"]) => {
    switch (status) {
      case "applied":
        return "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/60 dark:text-blue-400";
      case "interviewing":
        return "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400";
      case "offer":
        return "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/60 dark:text-green-400";
      case "rejected":
        return "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-400";
      default:
        return "bg-muted border-border text-muted-foreground";
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-600" />
          Recent Applications
        </h3>
        <Link
          href="/tracker"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
        >
          View all board
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {recentApps.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-border bg-surface/30">
          <p className="text-xs text-muted italic">No applications tracked yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {recentApps.map((app) => (
            <div
              key={app.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {app.job_title}
                </p>
                <p className="text-xs text-muted truncate">{app.company}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {app.fit_score !== null && (
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-[36px] items-center justify-center rounded-md px-1.5 text-[10px] font-extrabold tracking-wider border",
                      app.fit_score >= 75
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/25 dark:border-emerald-900/60 dark:text-emerald-400"
                        : app.fit_score >= 50
                        ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/25 dark:border-amber-900/60 dark:text-amber-400"
                        : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/25 dark:border-rose-900/60 dark:text-rose-400"
                    )}
                  >
                    {app.fit_score}%
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                    getStatusStyle(app.status)
                  )}
                >
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
