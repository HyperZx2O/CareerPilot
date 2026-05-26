"use client";

import React from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ApplicationCard from "./ApplicationCard";
import { cn } from "@/lib/utils";
import type { Application } from "@/types";

interface ColumnConfig {
  id: Application["status"];
  label: string;
  borderClass: string;
  headerBgClass: string;
  countBgClass: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "applied",
    label: "Applied",
    borderClass: "border-t-status-applied",
    headerBgClass: "bg-blue-50/60 dark:bg-blue-950/20",
    countBgClass: "bg-status-applied/10 text-status-applied",
  },
  {
    id: "interviewing",
    label: "Interviewing",
    borderClass: "border-t-status-interviewing",
    headerBgClass: "bg-amber-50/60 dark:bg-amber-950/20",
    countBgClass: "bg-status-interviewing/10 text-status-interviewing",
  },
  {
    id: "offer",
    label: "Offer",
    borderClass: "border-t-status-offer",
    headerBgClass: "bg-green-50/60 dark:bg-green-950/20",
    countBgClass: "bg-status-offer/10 text-status-offer",
  },
  {
    id: "rejected",
    label: "Rejected",
    borderClass: "border-t-status-rejected",
    headerBgClass: "bg-red-50/60 dark:bg-red-950/20",
    countBgClass: "bg-status-rejected/10 text-status-rejected",
  },
];

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange: (id: string, newStatus: Application["status"]) => Promise<void>;
  onUpdate: (app: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function KanbanBoard({
  applications,
  onStatusChange,
  onUpdate,
  onDelete,
}: KanbanBoardProps) {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Determine the column the card was dropped over
    // "over" may be another card or the column droppable itself
    const draggedId = active.id as string;
    const overId = over.id as string;

    // If dropped on a column id directly
    const targetColumn = COLUMNS.find((col) => col.id === overId);
    if (targetColumn) {
      const draggedApp = applications.find((a) => a.id === draggedId);
      if (draggedApp && draggedApp.status !== targetColumn.id) {
        await onStatusChange(draggedId, targetColumn.id);
      }
      return;
    }

    // If dropped on another card, find the column that card belongs to
    const overApp = applications.find((a) => a.id === overId);
    if (overApp) {
      const draggedApp = applications.find((a) => a.id === draggedId);
      if (draggedApp && draggedApp.status !== overApp.status) {
        await onStatusChange(draggedId, overApp.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colApps = applications.filter((a) => a.status === col.id);
          return (
            <KanbanColumn
              key={col.id}
              config={col}
              applications={colApps}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </DndContext>
  );
}

interface KanbanColumnProps {
  config: ColumnConfig;
  applications: Application[];
  onUpdate: (app: Partial<Application>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function KanbanColumn({
  config,
  applications,
  onUpdate,
  onDelete,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface/50 overflow-hidden min-h-[200px] border-t-4 shadow-sm transition-all duration-200",
        config.borderClass
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3.5 border-b border-border/60 shrink-0",
          config.headerBgClass
        )}
      >
        <span className="text-sm font-bold text-foreground tracking-wide">
          {config.label}
        </span>
        <span
          className={cn(
            "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold",
            config.countBgClass
          )}
        >
          {applications.length}
        </span>
      </div>

      {/* Cards Area */}
      <SortableContext
        items={applications.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          data-droppable-id={config.id}
          className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto"
        >
          {applications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <p className="text-xs text-muted/60 italic">
                No applications here yet. Drag cards in or add a new one.
              </p>
            </div>
          ) : (
            applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
