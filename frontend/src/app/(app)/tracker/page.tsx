"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getApplications, createApplication, updateApplication, deleteApplication,
  getGoals, getTodos, updateTodo, generateRoadmap, createGoal, generateGoals,
} from "@/lib/api";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppStore } from "@/store/useAppStore";
import type { Application, ApplicationStatus, Todo } from "@/types";
import { Plus, Sparkles, Bot, Target, Trash2, ChevronRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

const COLUMNS: { status: ApplicationStatus; label: string; color: string; icon: string }[] = [
  { status: "applied",      label: "Applied",      color: "#6366f1", icon: "📨" },
  { status: "interviewing", label: "Interviewing", color: "#f59e0b", icon: "🎤" },
  { status: "offer",        label: "Offer",         color: "#22c55e", icon: "🎉" },
  { status: "rejected",     label: "Rejected",     color: "#ef4444", icon: "❌" },
];

function getUserId(): string {
  return useAppStore.getState().userId || process.env.NEXT_PUBLIC_DEMO_USER_ID || "demo_user_123";
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6366f1",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const STATUS_COLORS: Record<string, string> = {
  applied: "#6366f1",
  interviewing: "#f59e0b",
  offer: "#22c55e",
  rejected: "#ef4444",
};

function ApplicationFunnel({ applications }: { applications: Application[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
    };
    applications.forEach((a) => {
      if (map[a.status] !== undefined) map[a.status]++;
    });
    return Object.entries(map).map(([status, value]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value,
      color: STATUS_COLORS[status],
    }));
  }, [applications]);

  const total = counts.reduce((sum, c) => sum + c.value, 0);

  return (
    <motion.div
      variants={itemVariants}
      className="mb-6 overflow-hidden rounded-2xl border p-5"
      style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
    >
      <h3 className="mb-4 font-semibold">Application Funnel</h3>
      {total > 0 ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-[200px] w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={counts}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {counts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 sm:w-1/2">
            {counts.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="flex-1 text-sm" style={{ color: "var(--cp-text-muted)" }}>
                  {item.name}
                </span>
                <span className="text-sm font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--cp-text-dim)" }}>
          No applications yet
        </p>
      )}
    </motion.div>
  );
}

export default function TrackerPage() {
  const [view, setView] = useState<"roadmap" | "kanban">("roadmap");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatingGoals, setGeneratingGoals] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalFormTitle, setGoalFormTitle] = useState("");
  const [goalFormDesc, setGoalFormDesc] = useState("");
  const [goalFormRole, setGoalFormRole] = useState("");
  const cvId = useAppStore((s) => s.cvId);
  const apps = useAppStore((s) => s.applications);
  const goals = useAppStore((s) => s.goals);
  const todos = useAppStore((s) => s.todos);
  const setApplications = useAppStore((s) => s.setApplications);
  const setGoals = useAppStore((s) => s.setGoals);
  const setTodos = useAppStore((s) => s.setTodos);

  async function loadAll() {
    try {
      const [appsData, goalsData, todosData] = await Promise.all([
        getApplications(getUserId()),
        getGoals(getUserId()),
        getTodos(getUserId()),
      ]);
      setApplications(appsData);
      setGoals(goalsData);
      setTodos(todosData);
      if (goalsData.length > 0 && !selectedGoalId) {
        setSelectedGoalId(goalsData[0].id);
      }
    } catch { setError("Failed to load data"); }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerateGoals() {
    setGeneratingGoals(true);
    try {
      const result = await generateGoals(getUserId(), cvId ?? undefined);
      setGoals(result.goals);
      if (result.goals.length > 0) setSelectedGoalId(result.goals[0].id);
    } catch { setError("Failed to generate goals"); }
    setGeneratingGoals(false);
  }

  async function handleCreateCustomGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalFormTitle.trim()) return;
    try {
      const goal = await createGoal({
        user_id: getUserId(),
        title: goalFormTitle.trim(),
        description: goalFormDesc.trim() || undefined,
        target_role: goalFormRole.trim() || undefined,
        priority: "medium",
      });
      setGoals([goal, ...useAppStore.getState().goals]);
      setSelectedGoalId(goal.id);
    } catch { setError("Failed to create goal"); }
    setGoalFormTitle(""); setGoalFormDesc(""); setGoalFormRole("");
    setShowGoalModal(false);
  }

  async function handleDeleteGoal(id: string) {
    const currentGoals = useAppStore.getState().goals;
    setGoals(useAppStore.getState().goals.filter((g) => g.id !== id));
    if (selectedGoalId === id) setSelectedGoalId(currentGoals[0]?.id ?? "");
    try {
      const { deleteGoal } = await import("@/lib/api");
      await deleteGoal(id);
    } catch { setError("Failed to delete goal"); }
  }

  async function handleGenerateRoadmap() {
    if (!selectedGoalId) return;
    const currentGoals = useAppStore.getState().goals;
    const goal = currentGoals.find((g) => g.id === selectedGoalId);
    if (!goal) return;
    setGenerating(true);
    try {
      const result = await generateRoadmap({
        user_id: getUserId(),
        cv_id: cvId ?? undefined,
        goal_id: selectedGoalId,
        target_role: goal.target_role || goal.title,
      });
      setTodos([...useAppStore.getState().todos, ...result.todos]);
    } catch { setError("Failed to generate roadmap"); }
    setGenerating(false);
  }

  async function handleToggleTodo(todo: Todo) {
    const newDone = !todo.done;
    setTodos(useAppStore.getState().todos.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t)));
    try { await updateTodo(todo.id, { done: newDone }); } catch { setError("Failed to update todo"); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formCompany.trim()) return;
    try {
      const app = await createApplication({
        user_id: getUserId(),
        job_title: formTitle,
        company: formCompany,
      });
      setApplications([app, ...useAppStore.getState().applications]);
    } catch { setError("Failed to add application"); const newApp: Application = {
      id: Date.now().toString(),
      user_id: getUserId(),
      job_title: formTitle,
      company: formCompany,
      location: null,
      deadline: null,
      status: "applied",
      notes: null,
      job_id: null,
      fit_score: null,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }; setApplications([...useAppStore.getState().applications, newApp]); }
    setFormTitle(""); setFormCompany(""); setShowForm(false);
  }

  async function handleMove(id: string, newStatus: ApplicationStatus) {
    setApplications(useAppStore.getState().applications.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    try { await updateApplication(id, { status: newStatus }); } catch { setError("Failed to update application"); }
  }

  async function handleDelete(id: string) {
    setApplications(useAppStore.getState().applications.filter((a) => a.id !== id));
    try { await deleteApplication(id); } catch { setError("Failed to delete application"); }
  }

  const roadmapTodos = useMemo(() => {
    const filtered = selectedGoalId
      ? todos.filter((t) => t.goal_id === selectedGoalId)
      : todos;
    const weeks: Record<string, Todo[]> = {};
    filtered.forEach((todo, i) => {
      const week = `Week ${Math.floor(i / 5) + 1}`;
      if (!weeks[week]) weeks[week] = [];
      weeks[week].push(todo);
    });
    return Object.entries(weeks);
  }, [todos, selectedGoalId]);

  const roadmapProgress = useMemo(() => {
    const filtered = selectedGoalId
      ? todos.filter((t) => t.goal_id === selectedGoalId)
      : todos;
    if (filtered.length === 0) return 0;
    const done = filtered.filter((t) => t.done).length;
    return Math.round((done / filtered.length) * 100);
  }, [todos, selectedGoalId]);

  if (loading) {
    return (
      <motion.div
        className="flex h-96 items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="mb-4 flex items-center gap-2 rounded-xl border p-3 text-sm animate-fade-in"
        style={{
          borderColor: "var(--cp-danger)",
          background: "rgba(239, 68, 68, 0.1)",
          color: "var(--cp-danger)",
        }}
      >
        {error}
        <motion.button
          onClick={() => setError(null)}
          className="ml-auto p-1"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex-1">
          <motion.h1
            className="mb-1 text-3xl font-bold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Tracker
          </motion.h1>
          <motion.p
            style={{ color: "var(--cp-text-muted)" }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {view === "roadmap" ? "Your AI-generated learning roadmap" : "Application Kanban board"}
          </motion.p>
        </div>

        {/* Tab toggle */}
        <motion.div
          className="flex rounded-xl border p-1"
          style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {(["roadmap", "kanban"] as const).map((v) => (
            <motion.button
              key={v}
              onClick={() => setView(v)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all"
              style={
                view === v
                  ? { background: "var(--cp-primary)", color: "#fff" }
                  : { color: "var(--cp-text-muted)" }
              }
              whileHover={view !== v ? { scale: 1.05 } : {}}
              whileTap={{ scale: 0.95 }}
            >
              {v}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* ── ROADMAP VIEW ── */}
      <AnimatePresence mode="wait">
        {view === "roadmap" && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Goal management bar */}
            <motion.div
              className="mb-6 flex flex-wrap items-center gap-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants} className="flex-1 min-w-[200px]">
                <select
                  className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                  style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                >
                  <option value="">All goals</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </motion.div>

              <motion.button
                variants={itemVariants}
                onClick={handleGenerateRoadmap}
                disabled={generating || !selectedGoalId}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl disabled:opacity-50"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {generating ? (
                  <>
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-t-transparent"
                      style={{ borderColor: "white", borderTopColor: "transparent" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Roadmap
                  </>
                )}
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={handleGenerateGoals}
                disabled={generatingGoals}
                className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-indigo-500/10"
                style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bot className="h-4 w-4" />
                {generatingGoals ? "Generating…" : "Regenerate from CV"}
              </motion.button>

              <motion.button
                variants={itemVariants}
                onClick={() => setShowGoalModal(true)}
                className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-indigo-500/10"
                style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="h-4 w-4" />
                Custom Goal
              </motion.button>
            </motion.div>

            {/* Selected goal card */}
            <AnimatePresence>
              {selectedGoalId && (() => {
                const goal = goals.find((g) => g.id === selectedGoalId);
                if (!goal) return null;
                return (
                  <motion.div
                    className="mb-6 overflow-hidden rounded-2xl border p-4"
                    style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
                    initial={{ opacity: 0, y: 20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Target className="h-5 w-5" style={{ color: "var(--cp-primary)" }} />
                          <h2 className="font-semibold">{goal.title}</h2>
                          {goal.priority && (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ background: `${PRIORITY_COLORS[goal.priority]}20`, color: PRIORITY_COLORS[goal.priority] }}
                            >
                              {goal.priority}
                            </span>
                          )}
                          {goal.source && (
                            <span
                              className="rounded-full px-2 py-0.5 text-xs"
                              style={{ background: "var(--cp-surface-2)", color: "var(--cp-text-muted)" }}
                            >
                              {goal.source === "ai" ? "AI" : "Custom"}
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="mb-2 text-sm" style={{ color: "var(--cp-text-muted)" }}>{goal.description}</p>
                        )}
                        {goal.target_role && (
                          <p className="text-xs" style={{ color: "var(--cp-text-dim)" }}>Target: {goal.target_role}</p>
                        )}
                      </div>
                      <motion.button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-red-500/10"
                        style={{ color: "var(--cp-danger)" }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Progress bar */}
            <AnimatePresence>
              {roadmapTodos.length > 0 && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mb-1 flex justify-between text-sm">
                    <span style={{ color: "var(--cp-text-muted)" }}>Overall Progress</span>
                    <span className="font-semibold">{roadmapProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--cp-surface-2)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, var(--cp-primary), var(--cp-accent))" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${roadmapProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Weekly columns */}
            {roadmapTodos.length > 0 ? (
              <motion.div
                className="flex gap-4 overflow-x-auto pb-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {roadmapTodos.map(([week, weekTodos]) => {
                  const done = weekTodos.filter((t) => t.done).length;
                  return (
                    <motion.div
                      key={week}
                      className="w-64 flex-shrink-0 overflow-hidden rounded-2xl border p-4"
                      style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
                      whileHover={{ borderColor: "var(--cp-primary)" }}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{week}</h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: done === weekTodos.length ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.2)",
                            color: done === weekTodos.length ? "#22c55e" : "#6366f1",
                          }}
                        >
                          {done}/{weekTodos.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {weekTodos.map((todo, i) => (
                          <motion.div
                            key={todo.id}
                            onClick={() => handleToggleTodo(todo)}
                            className="cursor-pointer overflow-hidden rounded-lg border p-3 transition-all"
                            style={{
                              background: todo.done ? "rgba(34,197,94,0.1)" : "var(--cp-surface-2)",
                              borderColor: todo.done ? "rgba(34,197,94,0.4)" : "var(--cp-border)",
                            }}
                            whileHover={{ scale: 1.02, borderColor: "var(--cp-primary)" }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <p className={`text-sm ${todo.done ? "line-through opacity-60" : ""}`}>
                              {todo.title}
                            </p>
                            {todo.due_date && (
                              <p className="mt-1 text-xs" style={{ color: "var(--cp-text-dim)" }}>
                                📅 {new Date(todo.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12"
                style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <motion.div
                  className="mb-4 text-5xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                >
                  🗺️
                </motion.div>
                <p className="mb-2 text-lg font-medium">No roadmap yet</p>
                <p className="text-sm">Select a goal and click &ldquo;Generate Roadmap&rdquo; to get started</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── KANBAN VIEW ── */}
        {view === "kanban" && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ApplicationFunnel applications={apps} />

            <div className="mb-6 flex items-center justify-between">
              <p style={{ color: "var(--cp-text-muted)" }}>Click to move between stages</p>
              <motion.button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-shadow hover:shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="h-4 w-4" />
                Add Application
              </motion.button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  className="mb-6 overflow-hidden rounded-2xl border p-4"
                  style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                >
                  <form onSubmit={handleAdd} className="flex flex-col gap-3 md:flex-row">
                    <input
                      className="flex-1 rounded-xl border bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                      style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                      placeholder="Job title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      autoFocus
                    />
                    <input
                      className="flex-1 rounded-xl border bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                      style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                      placeholder="Company"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                    />
                    <motion.button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Add
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-xl border px-4 py-2.5 text-sm font-medium"
                      style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {COLUMNS.map((col) => {
                const colApps = apps.filter((a) => a.status === col.status);
                return (
                  <motion.div
                    key={col.status}
                    className="min-h-[300px] overflow-hidden rounded-2xl border p-4"
                    style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
                    whileHover={{ borderColor: col.color }}
                  >
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-xl">{col.icon}</span>
                      <h3 className="font-semibold">{col.label}</h3>
                      <motion.span
                        className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: `${col.color}20`, color: col.color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {colApps.length}
                      </motion.span>
                    </div>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {colApps.map((app, i) => (
                          <motion.div
                            key={app.id}
                            className="overflow-hidden rounded-lg border p-3"
                            style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.05 }}
                            layout
                          >
                            <p className="font-medium text-sm">{app.job_title}</p>
                            <p className="mt-0.5 text-xs" style={{ color: "var(--cp-text-muted)" }}>{app.company}</p>
                            {app.fit_score !== null && (
                              <span
                                className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{ background: `${col.color}20`, color: col.color }}
                              >
                                Fit: {app.fit_score}%
                              </span>
                            )}
                            <div className="mt-3 flex flex-wrap gap-1">
                              {COLUMNS.filter((c) => c.status !== app.status).map((c) => (
                                <motion.button
                                  key={c.status}
                                  onClick={() => handleMove(app.id, c.status)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                                  style={{ background: `${c.color}15`, color: c.color }}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <ChevronRight className="h-3 w-3" />
                                  {c.label}
                                </motion.button>
                              ))}
                              <motion.button
                                onClick={() => handleDelete(app.id)}
                                className="ml-auto rounded p-1"
                                style={{ color: "var(--cp-danger)" }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.8 }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {colApps.length === 0 && (
                        <p className="py-6 text-center text-xs" style={{ color: "var(--cp-text-dim)" }}>No applications</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Custom Goal Modal ── */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false); }}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-2xl border p-6"
              style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <h2 className="mb-4 text-xl font-bold">Create Custom Goal</h2>
              <form onSubmit={handleCreateCustomGoal} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: "var(--cp-text-muted)" }}>
                    Goal Title *
                  </label>
                  <input
                    className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                    style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                    placeholder="e.g., Master React Native"
                    value={goalFormTitle}
                    onChange={(e) => setGoalFormTitle(e.target.value)}
                    autoFocus
                    maxLength={60}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: "var(--cp-text-muted)" }}>
                    Description
                  </label>
                  <input
                    className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                    style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                    placeholder="Brief description (optional)"
                    value={goalFormDesc}
                    onChange={(e) => setGoalFormDesc(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" style={{ color: "var(--cp-text-muted)" }}>
                    Target Role
                  </label>
                  <input
                    className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500"
                    style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                    placeholder="e.g., Senior Frontend Engineer"
                    value={goalFormRole}
                    onChange={(e) => setGoalFormRole(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <motion.button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-sm font-semibold text-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Create Goal
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-medium"
                    style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
