/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail · theme: Cobalt
 * section head: S3 sticky · feature: F4 step sequence / F6 card grid · CTA: C1 outlined
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getApplications, createApplication, updateApplication, deleteApplication,
  getGoals, getTodos, updateTodo, generateRoadmap, createGoal, generateGoals,
  deleteGoal,
} from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { Application, ApplicationStatus, Todo } from "@/types";
import { Plus, Sparkles, Bot, Target, Trash2, ChevronRight, Send, Mic, Award, XCircle, Calendar, Map, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ErrorOverlay from "@/components/ui/ErrorOverlay";

const COLUMNS: { status: ApplicationStatus; label: string; color: string; icon: LucideIcon }[] = [
  { status: "applied",      label: "Applied",      color: "var(--color-accent)",     icon: Send },
  { status: "interviewing", label: "Interviewing", color: "var(--color-accent)",     icon: Mic },
  { status: "offer",        label: "Offer",         color: "var(--color-success)",    icon: Award },
  { status: "rejected",     label: "Rejected",     color: "var(--color-accent)",     icon: XCircle },
];

const STATUS_COLORS: Record<string, string> = {
  applied: "var(--color-accent)",
  interviewing: "var(--color-accent)",
  offer: "var(--color-success)",
  rejected: "var(--color-accent)",
};

function DonutChart({ segments, total }: { segments: { name: string; value: number; color: string }[]; total: number }) {
  const cx = 40, cy = 40, r = 36, ir = 24;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((s) => {
    const pct = s.value / total;
    const length = pct * circumference;
    const dash = `${length} ${circumference - length}`;
    const o = offset;
    offset += length;
    return { ...s, dash, offset: o };
  });
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" className="shrink-0">
      {arcs.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={r - ir}
          strokeDasharray={s.dash} strokeDashoffset={-s.offset} transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.4s ease" }} />
      ))}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="text-xs font-bold tabular-nums" fill="currentColor">{total}</text>
    </svg>
  );
}

function ApplicationFunnel({ applications }: { applications: Application[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { applied: 0, interviewing: 0, offer: 0, rejected: 0 };
    applications.forEach((a) => { if (map[a.status] !== undefined) map[a.status]++; });
    return Object.entries(map).map(([status, value]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1), value, color: STATUS_COLORS[status],
    }));
  }, [applications]);
  const total = counts.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="mb-6 flex items-center gap-5 rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
      {total > 0 && <DonutChart segments={counts.filter((c) => c.value > 0)} total={total} />}
      <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
        {counts.map((item) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{item.name}</span>
            <span className="text-xs font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ app, onMove, onDelete }: { app: Application; onMove: (id: string, s: ApplicationStatus) => void; onDelete: (id: string) => void }) {
  return (
    <motion.div
      layout
      className="rounded-xl border p-3 text-sm"
      style={{ background: "var(--color-paper-2)", borderColor: "var(--color-border)" }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <p className="truncate font-medium text-sm">{app.job_title}</p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{app.company}</p>
      {app.fit_score !== null && (
        <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums" style={{ background: "color-mix(in srgb, var(--color-accent) 15%, transparent)", color: "var(--color-accent)" }}>
          Fit: {app.fit_score}%
        </span>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {COLUMNS.filter((c) => c.status !== app.status).map((c) => (
          <motion.button
            key={c.status}
            onClick={() => onMove(app.id, c.status)}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] transition-colors"
            style={{ background: `${c.color}15`, color: c.color }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="h-2.5 w-2.5" />{c.label}
          </motion.button>
        ))}
        <motion.button onClick={() => onDelete(app.id)} className="ml-auto rounded p-0.5" style={{ color: "var(--color-accent)" }} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
          <Trash2 className="h-3 w-3" />
        </motion.button>
      </div>
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
  const apps = useAppStore((s) => s.applications);
  const goals = useAppStore((s) => s.goals);
  const todos = useAppStore((s) => s.todos);
  const setApplications = useAppStore((s) => s.setApplications);
  const setGoals = useAppStore((s) => s.setGoals);
  const setTodos = useAppStore((s) => s.setTodos);

  async function loadAll() {
    try {
      const [appsList, goalsList, todosList] = await Promise.all([getApplications(), getGoals(), getTodos()]);
      setApplications(appsList);
      setGoals(goalsList);
      setTodos(todosList);
      if (goalsList.length > 0 && !selectedGoalId) setSelectedGoalId(goalsList[0].id);
    } catch { setError("Failed to load data"); }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerateGoals() {
    setGeneratingGoals(true);
    try {
      const result = await generateGoals();
      setGoals(result.goals);
      if (result.goals.length > 0) setSelectedGoalId(result.goals[0].id);
    } catch { setError("Failed to generate goals"); }
    setGeneratingGoals(false);
  }

  async function handleCreateCustomGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalFormTitle.trim()) return;
    try {
      const goal = await createGoal({ title: goalFormTitle.trim(), description: goalFormDesc.trim() || undefined, target_role: goalFormRole.trim() || undefined, priority: "medium" });
      setGoals([goal, ...useAppStore.getState().goals]);
      setSelectedGoalId(goal.id);
    } catch { setError("Failed to create goal"); }
    setGoalFormTitle(""); setGoalFormDesc(""); setGoalFormRole("");
    setShowGoalModal(false);
  }

  async function handleDeleteGoal(id: string) {
    const prev = useAppStore.getState().goals;
    const prevSel = selectedGoalId;
    setGoals(prev.filter((g) => g.id !== id));
    if (selectedGoalId === id) setSelectedGoalId(prev[0]?.id ?? "");
    try { await deleteGoal(id); } catch { setGoals(prev); setSelectedGoalId(prevSel); setError("Failed to delete goal"); }
  }

  async function handleGenerateRoadmap() {
    if (!selectedGoalId) return;
    const g = useAppStore.getState().goals.find((g) => g.id === selectedGoalId);
    if (!g) return;
    setGenerating(true);
    try {
      const result = await generateRoadmap({ goal_id: selectedGoalId, target_role: g.target_role || g.title });
      setTodos([...useAppStore.getState().todos, ...result.todos]);
    } catch { setError("Failed to generate roadmap"); }
    setGenerating(false);
  }

  async function handleToggleTodo(todo: Todo) {
    const newDone = !todo.done;
    const prev = useAppStore.getState().todos;
    setTodos(prev.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t)));
    try { await updateTodo(todo.id, { done: newDone }); } catch { setTodos(prev); setError("Failed to update todo"); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formCompany.trim()) return;
    const now = new Date().toISOString();
    const newApp: Application = { id: Date.now().toString(), user_id: "", job_title: formTitle, company: formCompany, location: null, deadline: null, status: "applied", notes: null, job_id: null, fit_score: null, applied_at: now, updated_at: now };
    const prev = useAppStore.getState().applications;
    setApplications([newApp, ...prev]);
    try {
      const app = await createApplication(newApp);
      if (app && app.id) setApplications([app, ...useAppStore.getState().applications.filter((a) => a.id !== newApp.id)]);
    } catch { setApplications(prev); setError("Failed to add application"); }
    setFormTitle(""); setFormCompany(""); setShowForm(false);
  }

  async function handleMove(id: string, newStatus: ApplicationStatus) {
    const prev = useAppStore.getState().applications;
    setApplications(prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    try { await updateApplication(id, { status: newStatus }); } catch { setApplications(prev); setError("Failed to update application"); }
  }

  async function handleDelete(id: string) {
    const prev = useAppStore.getState().applications;
    setApplications(prev.filter((a) => a.id !== id));
    try { await deleteApplication(id); } catch { setApplications(prev); setError("Failed to delete application"); }
  }

  const roadmapTodos = useMemo(() => {
    const filtered = selectedGoalId ? todos.filter((t) => t.goal_id === selectedGoalId) : todos;
    const weeks: Record<string, Todo[]> = {};
    filtered.forEach((todo, i) => {
      const week = `Week ${Math.floor(i / 5) + 1}`;
      if (!weeks[week]) weeks[week] = [];
      weeks[week].push(todo);
    });
    return Object.entries(weeks);
  }, [todos, selectedGoalId]);

  const roadmapProgress = useMemo(() => {
    const filtered = selectedGoalId ? todos.filter((t) => t.goal_id === selectedGoalId) : todos;
    if (filtered.length === 0) return 0;
    return Math.round((filtered.filter((t) => t.done).length / filtered.length) * 100);
  }, [todos, selectedGoalId]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><motion.div className="h-8 w-8 rounded-full border-2" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-5">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>Tracker</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>{view === "roadmap" ? "Your AI-generated learning roadmap" : "Application Kanban board"}</p>
      </div>

      {/* Sticky tab bar */}
      <div className="sticky top-0 z-10 mb-5 rounded-xl border p-1" style={{ background: "var(--color-paper-2)", borderColor: "var(--color-border)" }}>
        <div className="flex gap-1">
          {(["roadmap", "kanban"] as const).map((v) => (
            <motion.button
              key={v}
              onClick={() => setView(v)}
              className="flex-1 rounded-lg px-4 py-1.5 text-sm font-medium capitalize"
              style={view === v ? { background: "var(--color-accent)", color: "#fff" } : { color: "var(--color-text-muted)" }}
              whileHover={view !== v ? { scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
            >
              {v === "roadmap" ? <ListChecks className="mr-1.5 inline h-4 w-4" /> : <Target className="mr-1.5 inline h-4 w-4" />}
              {v}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "roadmap" && (
          <motion.div key="roadmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {/* Goal bar */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <select
                className="min-w-[180px] rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
              >
                <option value="">All goals</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <motion.button onClick={handleGenerateRoadmap} disabled={generating || !selectedGoalId} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50" style={{ background: "var(--color-accent)" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {generating ? <><motion.div className="h-3 w-3 rounded-full border-2 border-t-transparent" style={{ borderColor: "white", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /> Generating…</> : <><Sparkles className="h-3.5 w-3.5" /> Generate Roadmap</>}
              </motion.button>
              <motion.button onClick={handleGenerateGoals} disabled={generatingGoals} className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Bot className="h-3.5 w-3.5" />{generatingGoals ? "Generating…" : "Regenerate from CV"}
              </motion.button>
              <motion.button onClick={() => setShowGoalModal(true)} className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Plus className="h-3.5 w-3.5" />Custom Goal
              </motion.button>
            </div>

            {/* Selected goal card */}
            <AnimatePresence>
              {selectedGoalId && (() => {
                const goal = goals.find((g) => g.id === selectedGoalId);
                if (!goal) return null;
                return (
                  <motion.div className="mb-5 rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Target className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                          <h2 className="text-sm font-semibold">{goal.title}</h2>
                          {goal.priority && <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "color-mix(in srgb, var(--color-accent) 15%, transparent)", color: "var(--color-accent)" }}>{goal.priority}</span>}
                          {goal.source && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--color-paper-2)", color: "var(--color-text-muted)" }}>{goal.source === "ai" ? "AI" : "Custom"}</span>}
                        </div>
                        {goal.description && <p className="mb-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{goal.description}</p>}
                        {goal.target_role && <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>Target: {goal.target_role}</p>}
                      </div>
                      <motion.button onClick={() => handleDeleteGoal(goal.id)} className="rounded-lg px-2 py-1 text-xs transition-colors hover:bg-red-500/10" style={{ color: "var(--color-accent)" }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Progress */}
            {roadmapTodos.length > 0 && (
              <div className="mb-5">
                <div className="mb-1 flex justify-between text-xs">
                  <span style={{ color: "var(--color-text-muted)" }}>Overall Progress</span>
                  <span className="font-semibold tabular-nums">{roadmapProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-paper-2)" }}>
                  <motion.div className="h-full rounded-full" style={{ background: "var(--color-accent)" }} initial={{ width: 0 }} animate={{ width: `${roadmapProgress}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                </div>
              </div>
            )}

            {/* Weekly columns */}
            {roadmapTodos.length > 0 ? (
              <motion.div className="flex gap-4 overflow-x-auto pb-4">
                {roadmapTodos.map(([week, weekTodos]) => {
                  const done = weekTodos.filter((t) => t.done).length;
                  return (
                    <motion.div key={week} className="w-56 shrink-0 rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{week}</h3>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums" style={{ background: done === weekTodos.length ? "color-mix(in srgb, var(--color-success) 15%, transparent)" : "color-mix(in srgb, var(--color-accent) 15%, transparent)", color: done === weekTodos.length ? "var(--color-success)" : "var(--color-accent)" }}>{done}/{weekTodos.length}</span>
                      </div>
                      <div className="space-y-2">
                        {weekTodos.map((todo, i) => (
                          <motion.div
                            key={todo.id}
                            onClick={() => handleToggleTodo(todo)}
                            className="cursor-pointer rounded-lg border p-2.5 transition-all"
                            style={{ background: todo.done ? "color-mix(in srgb, var(--color-success) 8%, transparent)" : "var(--color-paper-2)", borderColor: todo.done ? "color-mix(in srgb, var(--color-success) 25%, transparent)" : "var(--color-border)" }}
                            whileHover={{ scale: 1.02, borderColor: "var(--color-accent)" }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <p className={`text-xs ${todo.done ? "line-through opacity-60" : ""}`}>{todo.title}</p>
                            {todo.due_date && <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}><Calendar className="mr-0.5 inline h-2.5 w-2.5" />{new Date(todo.due_date).toLocaleDateString()}</p>}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12" style={{ borderColor: "var(--color-border)" }}>
                <Map className="mb-3 h-10 w-10" style={{ color: "var(--color-text-dim)" }} strokeWidth={1.5} />
                <p className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text)" }}>No roadmap yet</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Select a goal and click Generate Roadmap</p>
              </div>
            )}
          </motion.div>
        )}

        {view === "kanban" && (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ApplicationFunnel applications={apps} />

            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Click to move between stages</p>
              <motion.button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white" style={{ background: "var(--color-accent)" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Plus className="h-3.5 w-3.5" />Add Application
              </motion.button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div className="mb-5 rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                  <form onSubmit={handleAdd} className="flex flex-col gap-3 md:flex-row">
                    <input className="flex-1 rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="Job title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus />
                    <input className="flex-1 rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="Company" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} />
                    <motion.button type="submit" className="rounded-xl px-5 py-2 text-sm font-semibold text-white" style={{ background: "var(--color-accent)" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Add</motion.button>
                    <motion.button type="button" onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2 text-sm font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Cancel</motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((col) => {
                const colApps = apps.filter((a) => a.status === col.status);
                return (
                  <div key={col.status} className="rounded-xl border p-3" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
                    <div className="mb-3 flex items-center gap-2">
                      <col.icon className="h-4 w-4" style={{ color: col.color }} />
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <motion.span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums" style={{ background: `${col.color}18`, color: col.color }} initial={{ scale: 0 }} animate={{ scale: 1 }}>{colApps.length}</motion.span>
                    </div>
                    <div className="space-y-2 min-h-[200px]">
                      <AnimatePresence>
                        {colApps.map((app) => <KanbanCard key={app.id} app={app} onMove={handleMove} onDelete={handleDelete} />)}
                      </AnimatePresence>
                      {colApps.length === 0 && <p className="py-6 text-center text-xs" style={{ color: "var(--color-text-dim)" }}>No applications</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) setShowGoalModal(false); }}>
            <motion.div className="w-full max-w-md overflow-hidden rounded-xl border p-5" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
              <h2 className="mb-4 text-base font-bold">Create Custom Goal</h2>
              <form onSubmit={handleCreateCustomGoal} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Goal Title *</label>
                  <input className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="e.g., Master React Native" value={goalFormTitle} onChange={(e) => setGoalFormTitle(e.target.value)} autoFocus maxLength={60} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Description</label>
                  <input className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="Brief description (optional)" value={goalFormDesc} onChange={(e) => setGoalFormDesc(e.target.value)} maxLength={120} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Target Role</label>
                  <input className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-sm outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="e.g., Senior Frontend Engineer" value={goalFormRole} onChange={(e) => setGoalFormRole(e.target.value)} />
                </div>
                <div className="flex gap-3 pt-1">
                  <motion.button type="submit" className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "var(--color-accent)" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Create Goal</motion.button>
                  <motion.button type="button" onClick={() => setShowGoalModal(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorOverlay error={error} onDismiss={() => setError(null)} />
    </motion.div>
  );
}
