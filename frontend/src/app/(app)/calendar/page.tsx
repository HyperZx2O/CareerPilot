/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail · theme: Cobalt
 * section head: S2 hanging · CTA: C2 inline form
 */
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTodos, createTodo, updateTodo, deleteTodo, getGoals, createGoal } from "@/lib/api";
import type { Todo, Goal } from "@/types";
import { Plus, Check, Trash2, Target, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import ErrorOverlay from "@/components/ui/ErrorOverlay";

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: () => void; onDelete: () => void }) {
  return (
    <motion.div className="flex items-center gap-2 rounded-lg p-2" style={{ background: "var(--color-paper-2)" }} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} layout>
      <motion.button onClick={onToggle} className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors" style={{ borderColor: todo.done ? "var(--color-success)" : "var(--color-border)", background: todo.done ? "var(--color-success)" : "transparent" }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        {todo.done && <Check className="h-2.5 w-2.5 text-white" />}
      </motion.button>
      <span className={`flex-1 text-xs ${todo.done ? "line-through opacity-50" : ""}`} style={{ color: "var(--color-text)" }}>{todo.title}</span>
      <motion.button onClick={onDelete} className="p-0.5" style={{ color: "var(--color-accent)" }} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
        <Trash2 className="h-3 w-3" />
      </motion.button>
    </motion.div>
  );
}

function GoalProgress({ goal }: { goal: Goal }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Target className="h-3 w-3" style={{ color: "var(--color-accent)" }} />
          {goal.title}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--color-text-muted)" }}>{goal.progress}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-paper-2)" }}>
        <motion.div className="h-full rounded-full" style={{ background: "var(--color-accent)" }} initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </motion.div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newGoal, setNewGoal] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [t, g] = await Promise.all([getTodos(), getGoals()]);
        setTodos(t.filter((todo) => !todo.goal_id));
        setGoals(g);
      } catch { setError("Failed to load calendar"); }
      setLoading(false);
    }
    load();
  }, []);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

  function todosForDate(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return todos.filter((t) => t.due_date === dateStr);
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodo.trim()) return;
    try {
      const todo = await createTodo({ title: newTodo, due_date: newDueDate || null });
      setTodos((prev) => [todo, ...prev]);
    } catch { setError("Failed to add todo"); setTodos((prev) => [{ id: Date.now().toString(), user_id: "", goal_id: null, title: newTodo, due_date: newDueDate || null, done: false, created_at: new Date().toISOString() }, ...prev]); }
    setNewTodo(""); setNewDueDate("");
  }

  async function handleToggle(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    try { await updateTodo(id, { done: !todo.done }); } catch { setError("Failed to update todo"); }
  }

  async function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try { await deleteTodo(id); } catch { setError("Failed to delete todo"); }
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoal.trim()) return;
    try {
      const goal = await createGoal({ title: newGoal });
      setGoals((prev) => [goal, ...prev]);
    } catch { setError("Failed to add goal"); setGoals((prev) => [{ id: Date.now().toString(), user_id: "", title: newGoal, target_date: null, progress: 0, created_at: new Date().toISOString() }, ...prev]); }
    setNewGoal("");
  }

  function prevMonth() { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); }
  function nextMonth() { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><motion.div className="h-8 w-8 rounded-full border-2" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>Calendar & Tasks</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Manage deadlines, todos, and goals</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Calendar */}
        <motion.div className="xl:col-span-2 overflow-hidden rounded-xl border" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <motion.button onClick={prevMonth} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors" style={{ color: "var(--color-text-muted)" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ChevronLeft className="h-3.5 w-3.5" />Prev
            </motion.button>
            <motion.h2 className="text-sm font-semibold" key={`${year}-${month}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              {monthName} {year}
            </motion.h2>
            <motion.button onClick={nextMonth} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors" style={{ color: "var(--color-text-muted)" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Next<ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-px px-4 text-center text-[10px] font-medium" style={{ color: "var(--color-text-dim)" }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-1.5">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-px px-4 pb-4">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayTodos = todosForDate(day);
              return (
                <motion.div
                  key={day}
                  className="min-h-[52px] rounded-lg p-1.5 text-xs transition-colors"
                  style={{ background: isToday ? "color-mix(in srgb, var(--color-accent) 10%, var(--color-paper))" : "var(--color-paper-2)", border: isToday ? "1px solid var(--color-accent)" : "1px solid transparent" }}
                  whileHover={{ borderColor: "var(--color-accent)" }}
                >
                  <span className={isToday ? "font-bold text-xs" : "text-xs"} style={{ color: isToday ? "var(--color-accent)" : "var(--color-text)" }}>{day}</span>
                  {dayTodos.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {dayTodos.slice(0, 2).map((t) => (
                        <div key={t.id} className="truncate rounded px-0.5 py-[1px] text-[9px] leading-tight" style={{ background: t.done ? "color-mix(in srgb, var(--color-success) 12%, transparent)" : "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: t.done ? "var(--color-success)" : "var(--color-accent)" }}>{t.title}</div>
                      ))}
                      {dayTodos.length > 2 && <div className="text-[9px]" style={{ color: "var(--color-text-dim)" }}>+{dayTodos.length - 2}</div>}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Add todo */}
          <div className="rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold">
              <CalendarIcon className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
              Add Todo
            </h3>
            <form onSubmit={handleAddTodo} className="space-y-2">
              <input className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="Todo title" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} />
              <input className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              <motion.button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white" style={{ background: "var(--color-accent)" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Plus className="h-3.5 w-3.5" />Add Todo
              </motion.button>
            </form>
          </div>

          {/* Todo list */}
          <div className="rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
            <h3 className="mb-3 text-xs font-semibold" style={{ color: "var(--color-text)" }}>Todos ({todos.filter((t) => !t.done).length} remaining)</h3>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              <AnimatePresence>
                {todos.map((t) => <TodoItem key={t.id} todo={t} onToggle={() => handleToggle(t.id)} onDelete={() => handleDeleteTodo(t.id)} />)}
              </AnimatePresence>
              {todos.length === 0 && <p className="py-3 text-center text-xs" style={{ color: "var(--color-text-dim)" }}>No todos yet</p>}
            </div>
          </div>

          {/* Goals */}
          <div className="rounded-xl border p-4" style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}>
            <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold">
              <Target className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
              Goals
            </h3>
            <form onSubmit={handleAddGoal} className="mb-3 flex gap-1.5">
              <input className="flex-1 rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="New goal" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} />
              <motion.button type="submit" className="rounded-xl px-3 py-2 text-xs font-semibold text-white" style={{ background: "var(--color-accent)" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Plus className="h-3.5 w-3.5" />
              </motion.button>
            </form>
            <div className="space-y-3">
              <AnimatePresence>
                {goals.map((g) => <GoalProgress key={g.id} goal={g} />)}
              </AnimatePresence>
              {goals.length === 0 && <p className="py-3 text-center text-xs" style={{ color: "var(--color-text-dim)" }}>No goals yet</p>}
            </div>
          </div>
        </div>
      </div>
      <ErrorOverlay error={error} onDismiss={() => setError(null)} />
    </motion.div>
  );
}
