/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail (sidebar) · theme: Cobalt
 * section heads: S2 hanging · stat strip: T4 · CTA: C3 typographic
 */
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboardStats, getNudge } from "@/lib/api";
import type { NudgeResponse } from "@/types";
import { TrendingUp, TrendingDown, Zap, Brain, Flame, Map, ExternalLink, Search, MessageSquare, CheckSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import ErrorOverlay from "@/components/ui/ErrorOverlay";

function StatStrip({ stats }: { stats: NonNullable<ReturnType<typeof useAppStore.getState>['stats']> }) {
  const items = [
    { label: "Applications", value: stats.applications_this_week, icon: Zap, sub: stats.applications_last_week },
    { label: "Skills", value: stats.skills_count, icon: Brain },
    { label: "Streak", value: `${stats.streak_days}d`, icon: Flame },
    { label: "Progress", value: `${stats.roadmap_progress}%`, icon: Map },
  ];

  return (
    <div className="stat-strip tnum mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4" style={{ borderColor: "var(--color-border)" }}>
      {items.map((item, i) => {
        const weekDiff = item.sub !== undefined ? item.value - (item.sub as number) : null;
        return (
          <div key={item.label} className="flex flex-col items-center justify-center px-4 py-5 text-center" style={{ background: "var(--color-paper)" }}>
            <item.icon className="mb-2 h-5 w-5" style={{ color: "var(--color-accent)" }} strokeWidth={1.5} />
            <motion.span
              className="text-2xl font-bold leading-none"
              style={{ color: "var(--color-text)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {item.value}
            </motion.span>
            <span className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{item.label}</span>
            {weekDiff !== null && (
              <span className="mt-0.5 flex items-center gap-0.5 text-[10px]" style={{ color: weekDiff >= 0 ? "var(--color-success)" : "var(--color-accent)" }}>
                {weekDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(weekDiff)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoadmapSection({ progress }: { progress: number }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
      <header className="head-hang mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Learning Roadmap</h2>
      </header>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span style={{ color: "var(--color-text-dim)" }}>Overall progress</span>
        <span className="font-semibold tabular-nums" style={{ color: "var(--color-accent)" }}>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--color-paper-2)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--color-accent)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function NudgeInline({ nudge }: { nudge: NudgeResponse }) {
  return (
    <motion.div
      className="rounded-xl border p-4 text-sm"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-paper))",
        borderColor: "color-mix(in srgb, var(--color-accent) 20%, var(--color-border))",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start gap-3">
        <Zap className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-accent)" }} />
        <div>
          <p className="font-medium" style={{ color: "var(--color-text)" }}>{nudge.message}</p>
          {nudge.jobs.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {nudge.jobs.map((j) => j.title).join(", ")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TopJobsList({ jobs }: { jobs: Array<{ title: string; company: string; location: string; url: string }> }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
      <header className="head-hang mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Top Matches</h2>
      </header>
      <div className="space-y-2">
        {jobs.map((job, i) => (
          <motion.a
            key={i}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all"
            style={{ background: "var(--color-paper-2)" }}
            whileHover={{ background: "color-mix(in srgb, var(--color-accent) 8%, var(--color-paper-2))" }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" style={{ color: "var(--color-text)" }}>{job.title}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{job.company} · {job.location}</p>
            </div>
            <ExternalLink className="ml-3 h-4 w-4 shrink-0" style={{ color: "var(--color-text-dim)" }} />
          </motion.a>
        ))}
      </div>
      {jobs.length > 0 && (
        <div className="mt-4 border-t pt-3 text-center" style={{ borderColor: "var(--color-border)" }}>
          <a href="/jobs" className="link text-sm" style={{ color: "var(--color-accent)" }}>
            View all jobs →
          </a>
        </div>
      )}
    </div>
  );
}

function ActionDock() {
  const actions = [
    { href: "/jobs", icon: Search, label: "Search Jobs", desc: "Find roles matching your CV" },
    { href: "/chat", icon: MessageSquare, label: "AI Assistant", desc: "Career advice grounded in your CV" },
    { href: "/tracker", icon: CheckSquare, label: "Kanban Board", desc: "Track your applications" },
  ];

  return (
    <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
      {actions.map((a) => (
        <motion.a
          key={a.href}
          href={a.href}
          className="flex flex-col items-center gap-1.5 px-4 py-5 text-center transition-all"
          style={{ background: "var(--color-paper)" }}
          whileHover={{ background: "color-mix(in srgb, var(--color-accent) 6%, var(--color-paper))" }}
        >
          <a.icon className="h-5 w-5" style={{ color: "var(--color-accent)" }} strokeWidth={1.5} />
          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{a.label}</span>
          <span className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>{a.desc}</span>
        </motion.a>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [nudge, setNudge] = useState<NudgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stats = useAppStore((s) => s.stats);

  useEffect(() => {
    async function load() {
      try {
        const [s, n] = await Promise.all([
          getDashboardStats(),
          getNudge(),
        ]);
        useAppStore.getState().setStats(s);
        setNudge(n);
      } catch { setError("Failed to load dashboard"); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <motion.div
          className="h-8 w-8 rounded-full border-2"
          style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const s = stats;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
          Your career at a glance
        </p>
      </div>

      {stats && <StatStrip stats={stats} />}

      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <RoadmapSection progress={s?.roadmap_progress ?? 0} />
          {nudge?.message && <NudgeInline nudge={nudge} />}
        </div>
        <div>
          {s?.top_jobs && s.top_jobs.length > 0 ? (
            <TopJobsList jobs={s.top_jobs} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-text-dim)" }}>No matching jobs found</p>
            </div>
          )}
        </div>
      </div>

      <ActionDock />
      <ErrorOverlay error={error} onDismiss={() => setError(null)} />
    </motion.div>
  );
}
