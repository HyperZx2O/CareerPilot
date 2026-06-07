"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDashboardStats, getNudge } from "@/lib/api";
import type { DashboardStats, NudgeResponse } from "@/types";
import { TrendingUp, TrendingDown, Zap, Brain, Flame, Map, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useUser } from "@clerk/nextjs";

function getUserId(): string {
  return useAppStore.getState().userId || process.env.NEXT_PUBLIC_DEMO_USER_ID || "demo_user_123";
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedStatCard({
  label,
  value,
  sub,
  icon: Icon,
  delay = 0,
  color = "var(--cp-primary)",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  delay?: number;
  color?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-lg cursor-pointer"
      style={{
        background: "var(--cp-surface)",
        borderColor: "var(--cp-border)",
      }}
      whileHover={{
        scale: 1.02,
        borderColor: "var(--cp-border-hover)",
        transition: { duration: 0.2 },
      }}
    >
      {/* Gradient glow on hover */}
      <motion.div
        className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-10"
        style={{ background: color }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--cp-text-muted)" }}>
            {label}
          </p>
          <motion.p
            className="text-3xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          {sub && (
            <motion.p
              className="text-xs mt-1 flex items-center gap-1"
              style={{ color: "var(--cp-text-dim)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
            >
              {sub.includes("↑") || sub.includes("↓") ? (
                <>
                  {sub.includes("↑") ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                  )}
                </>
              ) : null}
              {sub}
            </motion.p>
          )}
        </div>
        <motion.div
          className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
          style={{ background: `${color}20` }}
          whileHover={{ rotate: 5 }}
        >
          <Icon className="h-6 w-6" style={{ color }} strokeWidth={1.5} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function AnimatedNudgeBanner({ nudge }: { nudge: NudgeResponse }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mb-6 overflow-hidden rounded-2xl border p-5"
      style={{
        background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)",
        borderColor: "rgba(245, 158, 11, 0.3)",
      }}
    >
      {/* Animated pulse border */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: "2px solid",
          borderColor: "var(--cp-warning)",
        }}
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.01, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="relative flex items-center gap-4">
        <motion.div
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Zap className="h-6 w-6 text-amber-400" />
        </motion.div>
        <div className="flex-1">
          <p className="font-semibold">{nudge.message}</p>
          {nudge.jobs.length > 0 && (
            <p className="text-sm mt-1" style={{ color: "var(--cp-text-muted)" }}>
              {nudge.jobs.map((j) => j.title).join(", ")}
            </p>
          )}
        </div>
        <motion.button
          className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View Jobs
        </motion.button>
      </div>
    </motion.div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  desc,
  delay,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  delay: number;
  color: string;
}) {
  return (
    <motion.a
      href={href}
      variants={itemVariants}
      className="group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:shadow-lg"
      style={{
        background: "var(--cp-surface)",
        borderColor: "var(--cp-border)",
      }}
      whileHover={{
        scale: 1.02,
        borderColor: "var(--cp-border-hover)",
      }}
    >
      <motion.div
        className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110"
        style={{ background: `${color}15` }}
        whileHover={{ rotate: 5 }}
      >
        {icon}
      </motion.div>
      <div>
        <h3
          className="font-semibold transition-colors"
          style={{ color: "var(--cp-text)" }}
        >
          {title}
        </h3>
        <p
          className="text-sm"
          style={{ color: "var(--cp-text-dim)" }}
        >
          {desc}
        </p>
      </div>
      <motion.svg
        className="ml-auto h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--cp-text-muted)" }}
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </motion.svg>
    </motion.a>
  );
}

export default function DashboardPage() {
  const [nudge, setNudge] = useState<NudgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const cvId = useAppStore((s) => s.cvId);
  const stats = useAppStore((s) => s.stats);

  useEffect(() => {
    async function load() {
      try {
        const uid = getUserId();
        const [s, n] = await Promise.all([
          getDashboardStats(uid, cvId || undefined),
          getNudge(uid, cvId || undefined),
        ]);
        useAppStore.getState().setStats(s);
        setNudge(n);
      } catch {
        // Use persisted stats from localStorage if API fails
      }
      setLoading(false);
    }
    load();
  }, [cvId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <motion.div
          className="h-12 w-12 rounded-full border-4 border-t-transparent"
          style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const s = stats;
  const weekDiff = s
    ? s.applications_this_week - s.applications_last_week
    : 0;
  const weekTrend =
    weekDiff >= 0
      ? `↑ ${weekDiff} from last week`
      : `↓ ${Math.abs(weekDiff)} from last week`;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="mb-8" variants={itemVariants}>
        <motion.h1
          className="text-3xl font-bold mb-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          Dashboard
        </motion.h1>
        <motion.p
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Your career at a glance
        </motion.p>
      </motion.div>

      {/* Nudge banner */}
      {nudge?.message && <AnimatedNudgeBanner nudge={nudge} />}

      {/* Stat cards */}
      <motion.div
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-8"
        variants={containerVariants}
      >
        <AnimatedStatCard
          label="Applications This Week"
          value={s?.applications_this_week ?? "—"}
          sub={s ? weekTrend : "No data yet"}
          icon={Zap}
          delay={0}
          color="var(--cp-primary)"
        />
        <AnimatedStatCard
          label="Skills Detected"
          value={s?.skills_count ?? "—"}
          icon={Brain}
          delay={0.1}
          color="var(--cp-accent)"
        />
        <AnimatedStatCard
          label="Streak"
          value={s ? `${s.streak_days} days` : "—"}
          icon={Flame}
          delay={0.2}
          color="var(--cp-warning)"
        />
        <AnimatedStatCard
          label="Roadmap Progress"
          value={s ? `${s.roadmap_progress}%` : "—"}
          icon={Map}
          delay={0.3}
          color="var(--cp-success)"
        />
      </motion.div>

      {/* Roadmap progress bar */}
      <motion.div
        variants={itemVariants}
        className="mb-8 overflow-hidden rounded-2xl border p-5"
        style={{
          background: "var(--cp-surface)",
          borderColor: "var(--cp-border)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Learning Roadmap</h3>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--cp-accent)" }}
          >
            {s?.roadmap_progress ?? 0}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--cp-surface-2)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--cp-gradient)" }}
            initial={{ width: 0 }}
            animate={{ width: `${s?.roadmap_progress ?? 0}%` }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Top Matching Jobs */}
      <motion.div
        variants={itemVariants}
        className="mb-8 overflow-hidden rounded-2xl border p-5"
        style={{
          background: "var(--cp-surface)",
          borderColor: "var(--cp-border)",
        }}
      >
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          🎯 Top Matching Jobs
        </h3>
        {s?.top_jobs && s.top_jobs.length > 0 ? (
          <div className="space-y-3">
            {s.top_jobs.map((job, i) => (
              <motion.a
                key={i}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border p-3 transition-all hover:shadow-md"
                style={{ borderColor: "var(--cp-border)" }}
                whileHover={{ scale: 1.01, borderColor: "var(--cp-border-hover)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="text-xs" style={{ color: "var(--cp-text-muted)" }}>
                    {job.company} · {job.location}
                  </p>
                </div>
                <ExternalLink
                  className="ml-3 h-4 w-4 flex-shrink-0"
                  style={{ color: "var(--cp-text-dim)" }}
                />
              </motion.a>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--cp-text-dim)" }}>
            No matching jobs found
          </p>
        )}
      </motion.div>

      {/* Quick actions */}
      <motion.div className="grid gap-5 md:grid-cols-3" variants={containerVariants}>
        <QuickActionCard
          href="/jobs"
          icon="🔍"
          title="Search Jobs"
          desc="Find roles matching your CV"
          delay={0}
          color="var(--cp-primary)"
        />
        <QuickActionCard
          href="/chat"
          icon="💬"
          title="AI Assistant"
          desc="Career advice grounded in your CV"
          delay={0.1}
          color="var(--cp-accent)"
        />
        <QuickActionCard
          href="/tracker"
          icon="📋"
          title="Kanban Board"
          desc="Track your applications"
          delay={0.2}
          color="var(--cp-success)"
        />
      </motion.div>
    </motion.div>
  );
}
