"use client";

import React from "react";
import { CheckSquare, Square, Trash2, Calendar, Target } from "lucide-react";
import type { Todo, Goal } from "@/types";

interface TodoListProps {
  todos: Todo[];
  goals: Goal[];
  onToggleDone: (id: string, currentStatus: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedDateStr: string;
}

export default function TodoList({
  todos,
  goals,
  onToggleDone,
  onDelete,
  selectedDateStr,
}: TodoListProps) {
  // Helpers
  const getGoalTitle = (goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find((g) => g.id === goalId);
    return goal ? goal.title : null;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Date Subheader */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Calendar className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-foreground">
          Tasks due: {formatDate(selectedDateStr)}
        </h3>
        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-brand-50 border border-brand-100 text-brand-600 px-2 py-0.5 text-xs font-bold dark:bg-brand-950/20 dark:border-brand-900/40">
          {todos.length}
        </span>
      </div>

      {/* Todo items */}
      {todos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-4 py-8 text-center">
          <p className="text-xs text-muted italic">
            No tasks scheduled for this day. Click &quot;+ Add To-Do&quot; to schedule one.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {todos.map((todo) => {
            const goalTitle = getGoalTitle(todo.goal_id);
            return (
              <div
                key={todo.id}
                className="group flex items-start justify-between gap-3 p-3.5 rounded-xl border border-border bg-surface hover:shadow-sm hover:border-border/80 transition-all duration-200"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => onToggleDone(todo.id, todo.done)}
                    aria-label={todo.done ? "Mark task incomplete" : "Mark task complete"}
                    className="mt-0.5 text-muted hover:text-brand-600 active:scale-90 transition-colors shrink-0 cursor-pointer"
                  >
                    {todo.done ? (
                      <CheckSquare className="h-5 w-5 text-brand-600 animate-scale-in" />
                    ) : (
                      <Square className="h-5 w-5 text-muted/80" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium leading-relaxed break-words text-foreground transition-all duration-200 ${
                        todo.done ? "line-through text-muted/70 decoration-muted/50" : ""
                      }`}
                    >
                      {todo.title}
                    </p>
                    {goalTitle && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[10px] font-bold text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/40">
                        <Target className="h-2.5 w-2.5" />
                        {goalTitle}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onDelete(todo.id)}
                  aria-label="Delete task"
                  className="text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 cursor-pointer shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
