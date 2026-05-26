"use client";

import React from "react";
import { TrendingUp, TrendingDown, Target, Flame, FolderGit2, BadgeAlert } from "lucide-react";
import type { DashboardStats } from "@/types";

interface StatsGridProps {
  stats: DashboardStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const isTrendUp = stats.applications_this_week >= stats.applications_last_week;

  const statItems = [
    {
      label: "Applications This Week",
      value: stats.applications_this_week,
      icon: FolderGit2,
      iconClass: "text-blue-500 bg-blue-50/60 dark:bg-blue-950/20",
      description: (
        <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
          {isTrendUp ? (
            <span className="flex items-center gap-0.5 text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              +{stats.applications_this_week - stats.applications_last_week} vs last week
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-rose-600">
              <TrendingDown className="h-3 w-3" />
              {stats.applications_this_week - stats.applications_last_week} vs last week
            </span>
          )}
        </div>
      ),
    },
    {
      label: "CV Skills Detected",
      value: stats.skills_count,
      icon: BadgeAlert,
      iconClass: "text-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20",
      description: (
        <span className="text-[11px] text-muted block mt-1 font-medium">
          Extracting from your grounding CV
        </span>
      ),
    },
    {
      label: "Roadmap Progress",
      value: `${stats.roadmap_progress}%`,
      icon: Target,
      iconClass: "text-amber-500 bg-amber-50/60 dark:bg-amber-950/20",
      description: (
        <div className="w-full mt-2 h-1.5 rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${stats.roadmap_progress}%` }}
          />
        </div>
      ),
    },
    {
      label: "Activity Streak",
      value: `${stats.streak_days} days`,
      icon: Flame,
      iconClass: "text-rose-500 bg-rose-50/60 dark:bg-rose-950/20",
      description: (
        <span className="text-[11px] text-muted flex items-center gap-1 mt-1 font-medium">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse-dot" />
          Keep adding jobs to stay active!
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="relative flex flex-col justify-between p-5 rounded-2xl border border-border bg-surface/50 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block">
                  {item.label}
                </span>
                <span className="text-2xl font-bold text-foreground tracking-tight block">
                  {item.value}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl shrink-0 ${item.iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">{item.description}</div>
          </div>
        );
      })}
    </div>
  );
}
