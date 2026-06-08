"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTodos, createTodo, updateTodo, deleteTodo, getGoals, createGoal } from "@/lib/api";
import type { Todo, Goal } from "@/types";
import { Plus, Check, Trash2, Target, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import ErrorOverlay from "@/components/ui/ErrorOverlay";

const DEMO_USER_ID = "demo_user_123";

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: () => void; onDelete: () => void }) {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-lg p-2"
      style={{ background: "var(--cp-surface-2)" }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <motion.button
        onClick={onToggle}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
        style={{
          borderColor: todo.done ? "var(--cp-success)" : "var(--cp-border)",
          background: todo.done ? "var(--cp-success)" : "transparent",
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {todo.done && <Check className="h-3 w-3 text-white" />}
      </motion.button>
      <span className={`flex-1 text-sm ${todo.done ? "line-through opacity-50" : ""}`}>{todo.title}</span>
      <motion.button
        onClick={onDelete}
        className="p-1"
        style={{ color: "var(--cp-danger)" }}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.8 }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </motion.button>
    </motion.div>
  );
}

function GoalProgress({ goal }: { goal: Goal }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4" style={{ color: "var(--cp-primary)" }} />
          {goal.title}
        </span>
        <span className="text-xs" style={{ color: "var(--cp-text-muted)" }}>{goal.progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--cp-surface-2)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, var(--cp-primary), var(--cp-accent))" }}
          initial={{ width: 0 }}
          animate={{ width: `${goal.progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
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
        const [t, g] = await Promise.all([getTodos(DEMO_USER_ID), getGoals(DEMO_USER_ID)]);
        // Show only custom (non-AI) goals and unlinked todos so the
        // calendar isn't cluttered with Tracker's auto-generated content.
        setTodos(t.filter((todo) => !todo.goal_id));
        setGoals(g.filter((goal) => goal.source !== "ai"));
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
      const todo = await createTodo({ user_id: DEMO_USER_ID, title: newTodo, due_date: newDueDate || null });
      setTodos((prev) => [todo, ...prev]);
    } catch { setError("Failed to add todo"); setTodos((prev) => [
      { id: Date.now().toString(), user_id: DEMO_USER_ID, goal_id: null, title: newTodo, due_date: newDueDate || null, done: false, created_at: new Date().toISOString() },
      ...prev,
    ]); }
    setNewTodo("");
    setNewDueDate("");
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
      const goal = await createGoal({ user_id: DEMO_USER_ID, title: newGoal });
      setGoals((prev) => [goal, ...prev]);
    } catch { setError("Failed to add goal"); setGoals((prev) => [
      { id: Date.now().toString(), user_id: DEMO_USER_ID, title: newGoal, target_date: null, progress: 0, created_at: new Date().toISOString() },
      ...prev,
    ]); }
    setNewGoal("");
  }

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="mb-8" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <motion.h1
          className="mb-1 text-3xl font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          Calendar & Tasks
        </motion.h1>
        <motion.p
          style={{ color: "var(--cp-text-muted)" }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          Manage deadlines, todos, and goals
        </motion.p>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Calendar */}
        <motion.div
          className="xl:col-span-2 overflow-hidden rounded-2xl border"
          style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between p-4">
            <motion.button
              onClick={prevMonth}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-indigo-500/10"
              style={{ color: "var(--cp-text-muted)" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </motion.button>
            <motion.h2
              className="text-lg font-semibold"
              key={`${year}-${month}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {monthName} {year}
            </motion.h2>
            <motion.button
              onClick={nextMonth}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-indigo-500/10"
              style={{ color: "var(--cp-text-muted)" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>

          <div
            className="mb-2 grid grid-cols-7 gap-1 px-4 text-center text-xs font-medium"
            style={{ color: "var(--cp-text-dim)" }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-4 pb-4">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayTodos = todosForDate(day);
              return (
                <motion.div
                  key={day}
                  className="min-h-[60px] cursor-pointer rounded-lg p-2 text-sm transition-colors"
                  style={{
                    background: isToday ? "var(--cp-primary-glow)" : "var(--cp-surface-2)",
                    border: isToday ? "1px solid var(--cp-primary)" : "1px solid transparent",
                    color: isToday ? "var(--cp-primary)" : undefined,
                  }}
                  whileHover={{ scale: 1.05, borderColor: "var(--cp-primary)" }}
                >
                  <span className={isToday ? "font-bold" : ""}>{day}</span>
                  {dayTodos.length > 0 && (
                    <div className="mt-1">
                      {dayTodos.slice(0, 2).map((t) => (
                        <motion.div
                          key={t.id}
                          className="truncate rounded px-1 py-0.5 text-[10px]"
                          style={{
                            background: t.done ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
                            color: t.done ? "var(--cp-success)" : "var(--cp-primary)",
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          {t.title}
                        </motion.div>
                      ))}
                      {dayTodos.length > 2 && (
                        <div className="text-[10px]" style={{ color: "var(--cp-text-dim)" }}>
                          +{dayTodos.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Sidebar: Todos + Goals */}
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Add todo */}
          <motion.div
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
            variants={itemVariants}
          >
            <div className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <CalendarIcon className="h-5 w-5" style={{ color: "var(--cp-primary)" }} />
                Add Todo
              </h3>
              <form onSubmit={handleAddTodo} className="space-y-2">
                <input
                  className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500"
                  style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                  placeholder="Todo title"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                />
                <input
                  className="w-full rounded-xl border bg-[var(--cp-surface-2)] px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500"
                  style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
                <motion.button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-sm font-semibold text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="h-4 w-4" />
                  Add Todo
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Todo list */}
          <motion.div
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
            variants={itemVariants}
          >
            <div className="p-4">
              <h3 className="mb-3 font-semibold">
                Todos ({todos.filter((t) => !t.done).length} remaining)
              </h3>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                <AnimatePresence>
                  {todos.map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={() => handleToggle(t.id)} onDelete={() => handleDeleteTodo(t.id)} />
                  ))}
                </AnimatePresence>
                {todos.length === 0 && (
                  <p className="py-3 text-center text-sm" style={{ color: "var(--cp-text-dim)" }}>No todos yet</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Goals */}
          <motion.div
            className="overflow-hidden rounded-2xl border"
            style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}
            variants={itemVariants}
          >
            <div className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Target className="h-5 w-5" style={{ color: "var(--cp-primary)" }} />
                Goals
              </h3>
              <form onSubmit={handleAddGoal} className="mb-3 flex gap-2">
                <input
                  className="flex-1 rounded-xl border bg-[var(--cp-surface-2)] px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500"
                  style={{ borderColor: "var(--cp-border)", color: "var(--cp-text)" }}
                  placeholder="New goal"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                />
                <motion.button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </form>
              <div className="space-y-4">
                <AnimatePresence>
                  {goals.map((g) => (
                    <GoalProgress key={g.id} goal={g} />
                  ))}
                </AnimatePresence>
                {goals.length === 0 && (
                  <p className="py-3 text-center text-sm" style={{ color: "var(--cp-text-dim)" }}>No goals yet</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <ErrorOverlay error={error} onDismiss={() => setError(null)} />
    </motion.div>
  );
}
