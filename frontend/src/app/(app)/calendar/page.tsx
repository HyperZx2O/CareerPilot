"use client";

import { useEffect, useState } from "react";
import { getTodos, createTodo, updateTodo, deleteTodo, getGoals, createGoal } from "@/lib/api";
import type { Todo, Goal } from "@/types";

const DEMO_USER_ID = "demo-user-001";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newGoal, setNewGoal] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [t, g] = await Promise.all([
          getTodos(DEMO_USER_ID),
          getGoals(DEMO_USER_ID),
        ]);
        setTodos(t);
        setGoals(g);
      } catch {
        setTodos([]);
        setGoals([]);
      }
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
      const todo = await createTodo({
        user_id: DEMO_USER_ID,
        title: newTodo,
        due_date: newDueDate || undefined,
      });
      setTodos((prev) => [todo, ...prev]);
    } catch {
      setTodos((prev) => [
        {
          id: Date.now().toString(),
          user_id: DEMO_USER_ID,
          goal_id: null,
          title: newTodo,
          due_date: newDueDate || null,
          done: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setNewTodo("");
    setNewDueDate("");
  }

  async function handleToggle(id: string) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    try {
      await updateTodo(id, { done: !todo.done });
    } catch {}
  }

  async function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try { await deleteTodo(id); } catch {}
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoal.trim()) return;
    try {
      const goal = await createGoal({ user_id: DEMO_USER_ID, title: newGoal });
      setGoals((prev) => [goal, ...prev]);
    } catch {
      setGoals((prev) => [
        {
          id: Date.now().toString(),
          user_id: DEMO_USER_ID,
          title: newGoal,
          target_date: null,
          progress: 0,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
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
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Calendar & Tasks</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Manage deadlines, todos, and goals</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Calendar */}
        <div className="xl:col-span-2 cp-card">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="cp-btn cp-btn-ghost text-sm">← Prev</button>
            <h2 className="text-lg font-semibold">{monthName} {year}</h2>
            <button onClick={nextMonth} className="cp-btn cp-btn-ghost text-sm">Next →</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2"
            style={{ color: "var(--cp-text-dim)" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayTodos = todosForDate(day);
              return (
                <div key={day} className="relative rounded-lg p-2 min-h-[60px] text-sm transition-colors"
                  style={{
                    background: isToday ? "var(--cp-primary-glow)" : "var(--cp-surface-2)",
                    border: isToday ? "1px solid var(--cp-primary)" : "1px solid transparent",
                  }}>
                  <span className={isToday ? "font-bold" : ""} style={{ color: isToday ? "var(--cp-primary-hover)" : undefined }}>
                    {day}
                  </span>
                  {dayTodos.length > 0 && (
                    <div className="mt-1">
                      {dayTodos.slice(0, 2).map((t) => (
                        <div key={t.id} className="text-[10px] truncate rounded px-1"
                          style={{
                            background: t.done ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
                            color: t.done ? "var(--cp-success)" : "var(--cp-primary-hover)",
                          }}>
                          {t.title}
                        </div>
                      ))}
                      {dayTodos.length > 2 && (
                        <div className="text-[10px]" style={{ color: "var(--cp-text-dim)" }}>
                          +{dayTodos.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Todos + Goals */}
        <div className="space-y-6">
          {/* Add todo */}
          <div className="cp-card">
            <h3 className="font-semibold mb-3">Add Todo</h3>
            <form onSubmit={handleAddTodo} className="space-y-2">
              <input className="cp-input" placeholder="Todo title" value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)} />
              <input className="cp-input" type="date" value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)} />
              <button type="submit" className="cp-btn cp-btn-primary w-full">Add Todo</button>
            </form>
          </div>

          {/* Todo list */}
          <div className="cp-card">
            <h3 className="font-semibold mb-3">Todos ({todos.filter(t => !t.done).length} remaining)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {todos.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg p-2"
                  style={{ background: "var(--cp-surface-2)" }}>
                  <input type="checkbox" checked={t.done} onChange={() => handleToggle(t.id)}
                    className="h-4 w-4 rounded" />
                  <span className={`flex-1 text-sm ${t.done ? "line-through opacity-50" : ""}`}>{t.title}</span>
                  <button onClick={() => handleDeleteTodo(t.id)} className="text-xs"
                    style={{ color: "var(--cp-danger)" }}>✕</button>
                </div>
              ))}
              {todos.length === 0 && (
                <p className="text-sm text-center py-3" style={{ color: "var(--cp-text-dim)" }}>No todos yet</p>
              )}
            </div>
          </div>

          {/* Goals */}
          <div className="cp-card">
            <h3 className="font-semibold mb-3">Goals</h3>
            <form onSubmit={handleAddGoal} className="flex gap-2 mb-3">
              <input className="cp-input flex-1" placeholder="New goal" value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)} />
              <button type="submit" className="cp-btn cp-btn-primary text-sm">Add</button>
            </form>
            <div className="space-y-3">
              {goals.map((g) => (
                <div key={g.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{g.title}</span>
                    <span className="text-xs" style={{ color: "var(--cp-text-muted)" }}>{g.progress}%</span>
                  </div>
                  <div className="cp-progress">
                    <div className="cp-progress-bar" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <p className="text-sm text-center py-3" style={{ color: "var(--cp-text-dim)" }}>No goals yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
