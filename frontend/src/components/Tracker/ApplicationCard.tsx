"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Trash2,
  MapPin,
  Calendar,
  Sparkles,
  FileText,
  Check,
  X,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Application } from "@/types";

interface ApplicationCardProps {
  application: Application;
  onUpdate: (app: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ApplicationCard({
  application,
  onUpdate,
  onDelete,
}: ApplicationCardProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(application.notes ?? "");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  // Sync state if prop changes (e.g. from backend/mock reload)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotesText(application.notes ?? "");
  }, [application.notes]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditingNotes) {
      textareaRef.current?.focus();
    }
  }, [isEditingNotes]);

  const handleNotesBlur = () => {
    setIsEditingNotes(false);
    if (notesText.trim() !== (application.notes ?? "").trim()) {
      onUpdate({ id: application.id, notes: notesText.trim() || null });
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      textareaRef.current?.blur();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No deadline";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getFitScoreStyles = (score: number | null) => {
    if (score === null) return null;
    if (score >= 75) {
      return {
        bg: "bg-green-50 dark:bg-green-950/30",
        border: "border-green-100 dark:border-green-900/40",
        text: "text-green-700 dark:text-green-400",
      };
    }
    if (score >= 50) {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-100 dark:border-amber-900/40",
        text: "text-amber-700 dark:text-amber-400",
      };
    }
    return {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-100 dark:border-red-900/40",
      text: "text-red-700 dark:text-red-400",
    };
  };

  const fitScoreStyle = getFitScoreStyles(application.fit_score);

  const getBorderColorClass = (status: string) => {
    switch (status) {
      case "applied":
        return "border-l-status-applied";
      case "interviewing":
        return "border-l-status-interviewing";
      case "offer":
        return "border-l-status-offer";
      case "rejected":
        return "border-l-status-rejected";
      default:
        return "border-l-border";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-surface hover:shadow-md transition-all duration-200 border-l-4 select-none touch-none",
        getBorderColorClass(application.status)
      )}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground line-clamp-1">
            {application.job_title}
          </h3>
          <p className="text-xs font-semibold text-brand-600 line-clamp-1 mt-0.5">
            {application.company}
          </p>
        </div>

        {/* Drag handle & Delete tools */}
        <div
          className="flex items-center gap-1 shrink-0"
          onPointerDown={(e) => e.stopPropagation()} // Stop drag triggering on buttons
        >
          {showConfirmDelete ? (
            <div className="flex items-center gap-1.5 bg-surface border border-border px-1.5 py-0.5 rounded-lg shadow-sm animate-fade-in">
              <button
                onClick={() => onDelete(application.id)}
                className="p-1 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                title="Confirm delete"
                aria-label="Confirm delete"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="p-1 rounded hover:bg-brand-50 text-muted hover:text-foreground cursor-pointer"
                title="Cancel"
                aria-label="Cancel delete"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* Delete Trigger */}
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                aria-label="Delete application"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Drag Grip Handle */}
              <div
                {...attributes}
                {...listeners}
                className="p-1.5 rounded-lg text-muted hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-brand-50/50"
                title="Drag card"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card Details (Location & Deadline) */}
      <div className="flex flex-col gap-1 text-[11px] text-muted">
        {application.location && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted/80 shrink-0" />
            <span className="line-clamp-1">{application.location}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted/80 shrink-0" />
          <span>Due: {formatDate(application.deadline)}</span>
        </div>
      </div>

      {/* Card Footer (Fit Score & Notes Trigger) */}
      <div className="flex items-center justify-between gap-2 mt-1 border-t border-border/40 pt-2.5">
        {/* Fit Score Badge */}
        {application.fit_score !== null && fitScoreStyle ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide",
              fitScoreStyle.bg,
              fitScoreStyle.border,
              fitScoreStyle.text
            )}
          >
            <Sparkles className="h-2.5 w-2.5 shrink-0" />
            Fit Score: {application.fit_score}%
          </div>
        ) : (
          <div className="text-[10px] text-muted/60 font-medium">No score</div>
        )}

        {/* Date Added Info */}
        <span className="text-[10px] text-muted/80 italic">
          Added: {formatDate(application.applied_at)}
        </span>
      </div>

      {/* Collapsible / Editable Notes Block */}
      <div
        className="mt-1 border-t border-border/30 pt-2"
        onPointerDown={(e) => e.stopPropagation()} // Stop drag triggering on textarea
      >
        {isEditingNotes ? (
          <textarea
            ref={textareaRef}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            onBlur={handleNotesBlur}
            onKeyDown={handleNotesKeyDown}
            placeholder="Write notes here... (Ctrl+Enter to save)"
            className="w-full bg-background border border-brand-500 rounded-lg p-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none resize-none min-h-[50px] shadow-sm animate-fade-in"
          />
        ) : (
          <div
            onClick={() => setIsEditingNotes(true)}
            className="group/notes w-full text-left p-2 rounded-lg bg-surface/50 border border-border/40 text-xs text-muted hover:text-foreground hover:border-brand-300 hover:bg-brand-50/20 cursor-text transition-all duration-200"
          >
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted/80 mb-0.5">
              <FileText className="h-3 w-3 shrink-0" />
              Notes
            </div>
            {application.notes ? (
              <p className="line-clamp-2 leading-relaxed whitespace-pre-wrap">
                {application.notes}
              </p>
            ) : (
              <span className="italic text-muted/50">Add notes...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
