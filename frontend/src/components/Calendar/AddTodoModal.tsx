"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import type { Goal, Todo } from "@/types";

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Partial<Todo>) => Promise<void>;
  goals: Goal[];
  defaultDueDate?: string;
}

export default function AddTodoModal({
  isOpen,
  onClose,
  onSave,
  goals,
  defaultDueDate,
}: AddTodoModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? new Date().toISOString().split("T")[0]);
  const [goalId, setGoalId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync default date if provided and modal is opened
  React.useEffect(() => {
    if (isOpen && defaultDueDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDueDate(defaultDueDate);
    }
  }, [isOpen, defaultDueDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        due_date: dueDate || null,
        goal_id: goalId || null,
        done: false,
      });
      setTitle("");
      setGoalId("");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog Wrapper */}
      <div className="relative w-full max-w-md scale-95 transform rounded-2xl border border-border bg-surface p-6 shadow-xl transition-all animate-scale-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-border/60 hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-brand-600" />
          Add New Task
        </h2>
        <p className="text-xs text-muted mb-6">
          Create a to-do item and link it to one of your active goals.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="todo-title"
              className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5"
            >
              Task Title *
            </label>
            <input
              type="text"
              id="todo-title"
              required
              placeholder="e.g. Prepare for system design interview"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted/65 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="todo-due-date"
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5"
              >
                Due Date
              </label>
              <input
                type="date"
                id="todo-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-surface text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="todo-goal"
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5"
              >
                Link to Goal
              </label>
              <select
                id="todo-goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              >
                <option value="">No goal linked</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-border/60 text-sm font-semibold text-foreground transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSaving ? "Saving..." : "Add To-Do"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
