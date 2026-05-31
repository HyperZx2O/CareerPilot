"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, getNudge } from "@/lib/api";
import type { DashboardStats, NudgeResponse } from "@/types";

import { useAppStore } from "@/store/useAppStore";

const DEMO_USER_ID = "demo_user_123";

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) {
  return (
    <div className="cp-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--cp-text-muted)" }}>{label}</p>
          <p className="text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: "var(--cp-text-dim)" }}>{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nudge, setNudge] = useState<NudgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const cvId = useAppStore((s) => s.cvId);

  useEffect(() => {
    async function load() {
      try {
        const [s, n] = await Promise.all([
          getDashboardStats(DEMO_USER_ID, cvId || undefined),
          getNudge(DEMO_USER_ID, cvId || undefined),
        ]);
        setStats(s);
        setNudge(n);
      } catch {
        // Gracefully handle API unavailability in dev
        setStats({
          applications_this_week: 5,
          applications_last_week: 3,
          skills_count: 14,
          roadmap_progress: 62,
          streak_days: 7,
        });
      }
      setLoading(false);
    }
    load();
  }, [cvId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const s = stats!;
  const weekDiff = s.applications_this_week - s.applications_last_week;
  const weekTrend = weekDiff >= 0 ? `↑ ${weekDiff} from last week` : `↓ ${Math.abs(weekDiff)} from last week`;

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Your career at a glance</p>
      </div>

      {/* Nudge banner */}
      {nudge?.message && (
        <div className="cp-card mb-6 flex items-center gap-4 animate-pulse-glow"
          style={{ borderColor: "var(--cp-warning)" }}>
          <span className="text-3xl">⚡</span>
          <div className="flex-1">
            <p className="font-semibold">{nudge.message}</p>
            {nudge.jobs.length > 0 && (
              <p className="text-sm mt-1" style={{ color: "var(--cp-text-muted)" }}>
                {nudge.jobs.map((j) => j.title).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard label="Applications This Week" value={s.applications_this_week} sub={weekTrend} icon="📨" />
        <StatCard label="Skills Detected" value={s.skills_count} icon="🧠" />
        <StatCard label="Streak" value={`${s.streak_days} days`} icon="🔥" />
        <StatCard label="Roadmap Progress" value={`${s.roadmap_progress}%`} icon="🗺️" />
      </div>

      {/* Roadmap progress bar */}
      <div className="cp-card mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Learning Roadmap</h3>
          <span className="text-sm" style={{ color: "var(--cp-text-muted)" }}>{s.roadmap_progress}%</span>
        </div>
        <div className="cp-progress">
          <div className="cp-progress-bar" style={{ width: `${s.roadmap_progress}%` }} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-5 md:grid-cols-3">
        <a href="/jobs" className="cp-card flex items-center gap-4 cursor-pointer group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: "rgba(99, 102, 241, 0.15)" }}>🔍</div>
          <div>
            <h3 className="font-semibold group-hover:text-cp-primary-hover transition-colors">Search Jobs</h3>
            <p className="text-sm" style={{ color: "var(--cp-text-dim)" }}>Find roles matching your CV</p>
          </div>
        </a>
        <a href="/chat" className="cp-card flex items-center gap-4 cursor-pointer group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: "rgba(6, 182, 212, 0.15)" }}>💬</div>
          <div>
            <h3 className="font-semibold group-hover:text-cp-accent transition-colors">AI Assistant</h3>
            <p className="text-sm" style={{ color: "var(--cp-text-dim)" }}>Career advice grounded in your CV</p>
          </div>
        </a>
        <a href="/tracker" className="cp-card flex items-center gap-4 cursor-pointer group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: "rgba(34, 197, 94, 0.15)" }}>📋</div>
          <div>
            <h3 className="font-semibold group-hover:text-cp-success transition-colors">Kanban Board</h3>
            <p className="text-sm" style={{ color: "var(--cp-text-dim)" }}>Track your applications</p>
          </div>
        </a>
      </div>
    </div>
  );
}
