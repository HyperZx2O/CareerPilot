"use client";

import React from "react";
import { AlertCircle, Calendar } from "lucide-react";
import type { Application } from "@/types";
import { cn } from "@/lib/utils";

interface UpcomingDeadlinesProps {
  applications: Application[];
}

export default function UpcomingDeadlines({ applications }: UpcomingDeadlinesProps) {
  // Filter for apps with deadlines, sort ascending, and take next 5
  const upcomingApps = applications
    .filter((app) => app.deadline)
    .map((app) => {
      const deadlineDate = new Date(app.deadline!);
      const today = new Date();
      // Set hours to 0 to compare days directly
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);

      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...app,
        daysRemaining: diffDays,
      };
    })
    .filter((app) => app.daysRemaining >= 0) // Only display future deadlines
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  const getUrgencyStyles = (days: number) => {
    if (days <= 3) {
      return {
        borderClass: "border-l-status-rejected",
        badgeClass: "bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-400",
        label: `${days} day${days !== 1 ? "s" : ""} left`,
      };
    }
    if (days <= 7) {
      return {
        borderClass: "border-l-status-interviewing",
        badgeClass: "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400",
        label: `${days} days left`,
      };
    }
    return {
      borderClass: "border-l-status-offer",
      badgeClass: "bg-green-50 border-green-100 text-green-700 dark:bg-green-950/20 dark:border-green-900/60 dark:text-green-400",
      label: `${days} days left`,
    };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-bold text-foreground">Upcoming Deadlines</h3>
      </div>

      {upcomingApps.length === 0 ? (
        <div className="py-8 text-center rounded-xl border border-dashed border-border bg-surface/30">
          <p className="text-xs text-muted italic">No upcoming deadlines tracked.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingApps.map((app) => {
            const urgency = getUrgencyStyles(app.daysRemaining);
            return (
              <div
                key={app.id}
                className={cn(
                  "flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface border-l-4 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200",
                  urgency.borderClass
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {app.job_title}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {app.company} • Due {formatDate(app.deadline!)}
                  </p>
                </div>

                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[10px] font-extrabold tracking-wider shrink-0 uppercase",
                    urgency.badgeClass
                  )}
                >
                  <AlertCircle className="h-3 w-3" />
                  {urgency.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
