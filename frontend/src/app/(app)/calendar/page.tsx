"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-hot-toast";
import { Plus, Target, Calendar as CalendarIcon } from "lucide-react";
import { getTodos, upsertTodo, deleteTodo, getGoals, getApplications } from "@/lib/api";
import TodoList from "@/components/Calendar/TodoList";
import AddTodoModal from "@/components/Calendar/AddTodoModal";
import type { Todo, Goal, Application } from "@/types";

// Lazy-load FullCalendar to prevent SSR hydration issues and reduce initial bundle
const CalendarPanel = dynamic(
  () => import("@/components/Calendar/CalendarPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-2xl border border-border bg-surface/50 animate-pulse" />
    ),
  }
);

export default function CalendarPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);



  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [todosData, goalsData, appsData] = await Promise.all([
        getTodos(),
        getGoals(),
        getApplications(),
      ]);
      setTodos(todosData);
      setGoals(goalsData);
      setApplications(appsData);
    } catch {
      toast.error("Failed to load calendar data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Handle toggling todo done state
  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    // Optimistic Update
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !currentStatus } : t))
    );
    try {
      await upsertTodo({ id, done: !currentStatus });
      toast.success(currentStatus ? "Task reopened" : "Task completed!");
      
      // Update Goal progress if linked to a goal
      const updatedTodo = todos.find((t) => t.id === id);
      if (updatedTodo && updatedTodo.goal_id) {
        // Refresh data to grab updated goal progress from backend/mocks
        const freshTodos = await getTodos();
        setTodos(freshTodos);
        
        // Recalculate goal progress mock-side
        const goalId = updatedTodo.goal_id;
        const goalTodos = freshTodos.filter((t) => t.goal_id === goalId);
        const doneCount = goalTodos.filter((t) => t.done).length;
        const progress = goalTodos.length > 0 ? Math.round((doneCount / goalTodos.length) * 100) : 0;
        
        const localGoals = JSON.parse(localStorage.getItem("mock-goals") || "[]") as Goal[];
        const goalIdx = localGoals.findIndex((g) => g.id === goalId);
        if (goalIdx !== -1) {
          localGoals[goalIdx].progress = progress;
          localStorage.setItem("mock-goals", JSON.stringify(localGoals));
        }
        
        const freshGoals = await getGoals();
        setGoals(freshGoals);
      }
    } catch {
      toast.error("Failed to update task.");
      await loadData();
    }
  };

  // Handle deleting todo
  const handleDeleteTodo = async (id: string) => {
    // Optimistic Update
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTodo(id);
      toast.success("Task deleted.");
    } catch {
      toast.error("Failed to delete task.");
      await loadData();
    }
  };

  // Handle adding new todo
  const handleAddTodo = async (todoData: Partial<Todo>) => {
    try {
      const newTodo = await upsertTodo({
        ...todoData,
        due_date: todoData.due_date || selectedDate,
      });
      setTodos((prev) => [...prev, newTodo]);
      toast.success("Task added to your calendar!");

      // Update goal progress if linked
      if (newTodo.goal_id) {
        const freshTodos = [...todos, newTodo];
        const goalId = newTodo.goal_id;
        const goalTodos = freshTodos.filter((t) => t.goal_id === goalId);
        const doneCount = goalTodos.filter((t) => t.done).length;
        const progress = Math.round((doneCount / goalTodos.length) * 100);

        const localGoals = JSON.parse(localStorage.getItem("mock-goals") || "[]") as Goal[];
        const goalIdx = localGoals.findIndex((g) => g.id === goalId);
        if (goalIdx !== -1) {
          localGoals[goalIdx].progress = progress;
          localStorage.setItem("mock-goals", JSON.stringify(localGoals));
        }
        
        const freshGoals = await getGoals();
        setGoals(freshGoals);
      }
    } catch {
      toast.error("Failed to create task.");
    }
  };

  // Calendar Day Click Handler
  const handleDateClick = (arg: { dateStr: string }) => {
    setSelectedDate(arg.dateStr);
  };

  // Build events list for FullCalendar
  const calendarEvents = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      start: string;
      allDay: boolean;
      classNames: string[];
      extendedProps: { type: "todo" | "deadline" };
    }> = [];

    // Todos
    todos.forEach((todo) => {
      if (todo.due_date) {
        events.push({
          id: todo.id,
          title: `Task: ${todo.title}`,
          start: todo.due_date,
          allDay: true,
          classNames: todo.done 
            ? ["!bg-emerald-500/15 !border-emerald-500/30 !text-emerald-600 line-through opacity-70"]
            : ["!bg-amber-500/15 !border-amber-500/30 !text-amber-600"],
          extendedProps: { type: "todo" },
        });
      }
    });

    // Application Deadlines
    applications.forEach((app) => {
      if (app.deadline) {
        events.push({
          id: app.id,
          title: `Apply: ${app.company}`,
          start: app.deadline,
          allDay: true,
          classNames: app.status === "applied" || app.status === "interviewing" || app.status === "offer"
            ? ["!bg-brand-500/15 !border-brand-500/30 !text-brand-600"]
            : ["!bg-rose-500/15 !border-rose-500/30 !text-rose-600"],
          extendedProps: { type: "deadline" },
        });
      }
    });

    return events;
  }, [todos, applications]);

  // Filtered todos for current selected day and active goal filter
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const matchesDate = todo.due_date === selectedDate;
      const matchesGoal = selectedGoalFilter ? todo.goal_id === selectedGoalFilter : true;
      return matchesDate && matchesGoal;
    });
  }, [todos, selectedDate, selectedGoalFilter]);


  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarIcon className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-foreground">Calendar & Tasks</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Track deadlines, link tasks to career goals, and view your week at a glance.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add To-Do
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/50 h-[500px] animate-pulse" />
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-surface/50 h-[200px] animate-pulse" />
            <div className="rounded-2xl border border-border bg-surface/50 h-[260px] animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Panel — lazy-loaded via next/dynamic (ssr: false) */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/50 p-4 shadow-sm overflow-hidden min-h-[500px]">
            <div className="calendar-container premium-fullcalendar">
              <CalendarPanel
                events={calendarEvents}
                onDateClick={handleDateClick}
              />
            </div>
          </div>

          {/* Goal & To-Do Panel */}
          <div className="flex flex-col gap-6">
            {/* Goals Tracker Card */}
            <div className="rounded-2xl border border-border bg-surface/50 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-brand-600" />
                <h3 className="text-sm font-bold text-foreground">Career Goals</h3>
              </div>

              <div className="space-y-4">
                {goals.length === 0 ? (
                  <p className="text-xs text-muted italic">No goals defined yet.</p>
                ) : (
                  goals.map((goal) => {
                    const isSelected = selectedGoalFilter === goal.id;
                    return (
                      <div
                        key={goal.id}
                        onClick={() =>
                          setSelectedGoalFilter(isSelected ? null : goal.id)
                        }
                        className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-brand-50 border-brand-200 dark:bg-brand-950/20 dark:border-brand-900/60"
                            : "bg-surface border-border hover:border-border/80 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-xs font-bold leading-normal ${
                              isSelected
                                ? "text-brand-700 dark:text-brand-400"
                                : "text-foreground"
                            }`}
                          >
                            {goal.title}
                          </span>
                          <span className="text-[10px] font-extrabold text-muted shrink-0">
                            {goal.progress}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                          <div
                            className="h-full bg-brand-600 rounded-full transition-all duration-500"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedGoalFilter && (
                <button
                  onClick={() => setSelectedGoalFilter(null)}
                  className="mt-4 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Todo List Card */}
            <div className="rounded-2xl border border-border bg-surface/50 p-5 shadow-sm">
              <TodoList
                todos={filteredTodos}
                goals={goals}
                onToggleDone={handleToggleTodo}
                onDelete={handleDeleteTodo}
                selectedDateStr={selectedDate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Todo Modal */}
      <AddTodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddTodo}
        goals={goals}
        defaultDueDate={selectedDate}
      />
    </div>
  );
}
