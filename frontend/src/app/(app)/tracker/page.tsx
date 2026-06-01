"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getApplications, createApplication, updateApplication, deleteApplication,
  getGoals, getTodos, updateTodo, generateRoadmap, createGoal, generateGoals,
} from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { Application, ApplicationStatus, Todo } from "@/types";

const COLUMNS: { status: ApplicationStatus; label: string; color: string; icon: string }[] = [
  { status: "applied",      label: "Applied",      color: "#6366f1", icon: "📨" },
  { status: "interviewing", label: "Interviewing", color: "#f59e0b", icon: "🎤" },
  { status: "offer",        label: "Offer",         color: "#22c55e", icon: "🎉" },
  { status: "rejected",     label: "Rejected",     color: "#ef4444", icon: "❌" },
];

const DEMO_USER_ID = "demo_user_123"; // Must match backend auth.py

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6366f1",
};

export default function TrackerPage() {
  const [view, setView] = useState<"roadmap" | "kanban">("roadmap");
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [appsData, goalsData, todosData] = await Promise.all([
        getApplications(DEMO_USER_ID),
        getGoals(DEMO_USER_ID),
        getTodos(DEMO_USER_ID),
      ]);
      setApplications(appsData);
      setGoals(goalsData);
      setTodos(todosData);
      if (goalsData.length > 0 && !selectedGoalId) {
        setSelectedGoalId(goalsData[0].id);
      }
    } catch {
      // Use persisted data from localStorage if API fails
    }
    setLoading(false);
  }

  async function handleGenerateGoals() {
    setGeneratingGoals(true);
    try {
      const result = await generateGoals(DEMO_USER_ID, cvId ?? undefined);
      setGoals(result.goals);
      if (result.goals.length > 0) {
        setSelectedGoalId(result.goals[0].id);
      }
    } catch {
      // silent fail
    }
    setGeneratingGoals(false);
  }

  async function handleCreateCustomGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalFormTitle.trim()) return;
    try {
      const goal = await createGoal({
        user_id: DEMO_USER_ID,
        title: goalFormTitle.trim(),
        description: goalFormDesc.trim() || undefined,
        target_role: goalFormRole.trim() || undefined,
        priority: "medium",
      });
      setGoals((prev) => [goal, ...prev]);
      setSelectedGoalId(goal.id);
    } catch { /* silent fail */ }
    setGoalFormTitle(""); setGoalFormDesc(""); setGoalFormRole("");
    setShowGoalModal(false);
  }

  async function handleDeleteGoal(id: string) {
    const currentGoals = useAppStore.getState().goals;
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (selectedGoalId === id) setSelectedGoalId(currentGoals[0]?.id ?? "");
    try {
      const { deleteGoal } = await import("@/lib/api");
      await deleteGoal(id);
    } catch {}
  }

  async function handleGenerateRoadmap() {
    if (!selectedGoalId) return;
    const currentGoals = useAppStore.getState().goals;
    const goal = currentGoals.find((g) => g.id === selectedGoalId);
    if (!goal) return;
    setGenerating(true);
    try {
      const result = await generateRoadmap({
        user_id: DEMO_USER_ID,
        cv_id: cvId ?? undefined,
        goal_id: selectedGoalId,
        target_role: goal.target_role || goal.title,
      });
      setTodos(result.todos);
    } catch {
      // silent fail
    }
    setGenerating(false);
  }

  async function handleToggleTodo(todo: Todo) {
    const newDone = !todo.done;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t))
    );
    try { await updateTodo(todo.id, { done: newDone }); } catch {}
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formCompany.trim()) return;
    try {
      const app = await createApplication({
        user_id: DEMO_USER_ID,
        job_title: formTitle,
        company: formCompany,
      });
      setApplications((prev) => [app, ...prev]);
    } catch {
      // Create locally if API fails
      const newApp: Application = {
        id: Date.now().toString(),
        user_id: DEMO_USER_ID,
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
      };
      setApplications((prev) => [newApp, ...prev]);
    }
    setFormTitle(""); setFormCompany(""); setShowForm(false);
  }

  async function handleMove(id: string, newStatus: ApplicationStatus) {
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    try { await updateApplication(id, { status: newStatus }); } catch {}
  }

  async function handleDelete(id: string) {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    try { await deleteApplication(id); } catch {}
  }

  // ── Roadmap view ──────────────────────────────────────────
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
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">Tracker</h1>
          <p style={{ color: "var(--cp-text-muted)" }}>
            {view === "roadmap" ? "Your AI-generated learning roadmap" : "Application Kanban board"}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg border p-1" style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}>
          {(["roadmap", "kanban"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
              style={view === v
                ? { background: "var(--cp-primary)", color: "#fff" }
                : { color: "var(--cp-text-muted)" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── ROADMAP VIEW ── */}
      {view === "roadmap" && (
        <div>
          {/* Goal management bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              className="cp-input max-w-xs"
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
            >
              <option value="">All goals</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
            <button
              onClick={handleGenerateRoadmap}
              disabled={generating || !selectedGoalId}
              className="cp-btn cp-btn-primary text-sm"
            >
              {generating ? "✨ Generating…" : "✨ Generate Roadmap"}
            </button>
            <button
              onClick={handleGenerateGoals}
              disabled={generatingGoals}
              className="cp-btn cp-btn-ghost text-sm"
            >
              {generatingGoals ? "🤖 Generating…" : "🤖 Regenerate from CV"}
            </button>
            <button
              onClick={() => setShowGoalModal(true)}
              className="cp-btn cp-btn-ghost text-sm"
            >
              + Custom Goal
            </button>
          </div>

          {/* Selected goal card */}
          {selectedGoalId && (() => {
            const goal = goals.find((g) => g.id === selectedGoalId);
            if (!goal) return null;
            return (
              <div className="mb-6 rounded-xl border p-4 animate-fade-in"
                style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-semibold truncate">{goal.title}</h2>
                      {goal.priority && (
                        <span className="text-xs rounded-full px-2 py-0.5 font-medium"
                          style={{ background: `${PRIORITY_COLORS[goal.priority]}20`, color: PRIORITY_COLORS[goal.priority] }}>
                          {goal.priority}
                        </span>
                      )}
                      {goal.source && (
                        <span className="text-xs rounded-full px-2 py-0.5"
                          style={{ background: "var(--cp-surface-2)", color: "var(--cp-text-muted)" }}>
                          {goal.source === "ai" ? "🤖 AI" : "✏️ Custom"}
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm mb-2" style={{ color: "var(--cp-text-muted)" }}>{goal.description}</p>
                    )}
                    {goal.target_role && (
                      <p className="text-xs" style={{ color: "var(--cp-text-dim)" }}>Target: {goal.target_role}</p>
                    )}
                  </div>
                  <button onClick={() => handleDeleteGoal(goal.id)}
                    className="text-sm flex-shrink-0"
                    style={{ color: "var(--cp-danger)" }}>🗑</button>
                </div>
              </div>
            );
          })()}

          {/* Progress bar */}
          {roadmapTodos.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: "var(--cp-text-muted)" }}>Overall Progress</span>
                <span className="font-semibold">{roadmapProgress}%</span>
              </div>
              <div className="cp-progress">
                <div className="cp-progress-bar" style={{ width: `${roadmapProgress}%` }} />
              </div>
            </div>
          )}

          {/* Weekly columns */}
          {roadmapTodos.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {roadmapTodos.map(([week, weekTodos]) => {
                const done = weekTodos.filter((t) => t.done).length;
                return (
                  <div key={week} className="flex-shrink-0 w-64 rounded-xl border p-4 min-h-[300px]"
                    style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">{week}</h3>
                      <span className="text-xs rounded-full px-2 py-0.5"
                        style={{ background: done === weekTodos.length ? "#22c55e20" : "#6366f120", color: done === weekTodos.length ? "#22c55e" : "#6366f1" }}>
                        {done}/{weekTodos.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {weekTodos.map((todo) => (
                        <div key={todo.id}
                          onClick={() => handleToggleTodo(todo)}
                          className="rounded-lg border p-3 cursor-pointer transition-all hover:scale-[1.02]"
                          style={{
                            background: todo.done ? "#22c55e10" : "var(--cp-surface-2)",
                            borderColor: todo.done ? "#22c55e40" : "var(--cp-border)",
                          }}>
                          <p className={`text-sm ${todo.done ? "line-through opacity-60" : ""}`}>
                            {todo.title}
                          </p>
                          {todo.due_date && (
                            <p className="text-xs mt-1" style={{ color: "var(--cp-text-dim)" }}>
                              📅 {new Date(todo.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed"
              style={{ borderColor: "var(--cp-border)", color: "var(--cp-text-muted)" }}>
              <p className="text-lg mb-2">🗺️</p>
              <p className="font-medium">No roadmap yet</p>
              <p className="text-sm">Select a goal and click "Generate Roadmap" to get started</p>
            </div>
          )}
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === "kanban" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <p style={{ color: "var(--cp-text-muted)" }}>Click to move between stages</p>
            <button onClick={() => setShowForm(true)} className="cp-btn cp-btn-primary">+ Add Application</button>
          </div>

          {showForm && (
            <div className="cp-card mb-6 animate-fade-in">
              <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
                <input className="cp-input flex-1" placeholder="Job title" value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)} autoFocus />
                <input className="cp-input flex-1" placeholder="Company" value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)} />
                <button type="submit" className="cp-btn cp-btn-primary">Add</button>
                <button type="button" onClick={() => setShowForm(false)} className="cp-btn cp-btn-ghost">Cancel</button>
              </form>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const colApps = apps.filter((a) => a.status === col.status);
              return (
                <div key={col.status} className="rounded-xl border p-4 min-h-[300px]"
                  style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span>{col.icon}</span>
                    <h3 className="font-semibold">{col.label}</h3>
                    <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: `${col.color}20`, color: col.color }}>
                      {colApps.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {colApps.map((app) => (
                      <div key={app.id} className="rounded-lg border p-3 animate-fade-in"
                        style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}>
                        <p className="font-medium text-sm">{app.job_title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--cp-text-muted)" }}>{app.company}</p>
                        {app.fit_score !== null && (
                          <span className="cp-badge mt-2" style={{ background: `${col.color}20`, color: col.color }}>
                            Fit: {app.fit_score}%
                          </span>
                        )}
                        <div className="flex gap-1 mt-3 flex-wrap">
                          {COLUMNS.filter((c) => c.status !== app.status).map((c) => (
                            <button key={c.status} onClick={() => handleMove(app.id, c.status)}
                              className="text-xs rounded px-2 py-1 transition-colors"
                              style={{ background: `${c.color}15`, color: c.color }}>
                              → {c.label}
                            </button>
                          ))}
                          <button onClick={() => handleDelete(app.id)}
                            className="text-xs rounded px-2 py-1 ml-auto"
                            style={{ color: "var(--cp-danger)" }}>🗑</button>
                        </div>
                      </div>
                    ))}
                    {colApps.length === 0 && (
                      <p className="text-center text-xs py-6" style={{ color: "var(--cp-text-dim)" }}>No applications</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Custom Goal Modal ── */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false); }}>
          <div className="w-full max-w-md rounded-2xl border p-6 animate-fade-in"
            style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
            <h2 className="text-xl font-bold mb-4">Create Custom Goal</h2>
            <form onSubmit={handleCreateCustomGoal} className="space-y-4">
              <div>
                <label className="cp-label">Goal Title *</label>
                <input
                  className="cp-input w-full"
                  placeholder="e.g., Master React Native"
                  value={goalFormTitle}
                  onChange={(e) => setGoalFormTitle(e.target.value)}
                  autoFocus
                  maxLength={60}
                />
              </div>
              <div>
                <label className="cp-label">Description</label>
                <input
                  className="cp-input w-full"
                  placeholder="Brief description (optional)"
                  value={goalFormDesc}
                  onChange={(e) => setGoalFormDesc(e.target.value)}
                  maxLength={120}
                />
              </div>
              <div>
                <label className="cp-label">Target Role</label>
                <input
                  className="cp-input w-full"
                  placeholder="e.g., Senior Frontend Engineer"
                  value={goalFormRole}
                  onChange={(e) => setGoalFormRole(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="cp-btn cp-btn-primary flex-1">Create Goal</button>
                <button type="button" onClick={() => setShowGoalModal(false)} className="cp-btn cp-btn-ghost flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
