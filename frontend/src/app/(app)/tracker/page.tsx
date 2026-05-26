"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, LayoutGrid } from "lucide-react";
import { toast } from "react-hot-toast";
import KanbanBoard from "@/components/Tracker/KanbanBoard";
import AddApplicationModal from "@/components/Tracker/AddApplicationModal";
import { getApplications, upsertApplication, deleteApplication } from "@/lib/api";
import type { Application } from "@/types";

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getApplications();
      setApplications(data);
    } catch {
      toast.error("Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApplications();
  }, [loadApplications]);

  // Handle dragging a card to a new column (status change)
  const handleStatusChange = async (id: string, newStatus: Application["status"]) => {
    // Optimistic update
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    try {
      await upsertApplication({ id, status: newStatus });
      toast.success(`Moved to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}!`);
    } catch {
      toast.error("Failed to update status.");
      // Revert on failure
      await loadApplications();
    }
  };

  // Handle inline notes/field updates
  const handleUpdate = async (appData: Partial<Application>) => {
    if (!appData.id) return;
    // Optimistic update
    setApplications((prev) =>
      prev.map((app) => (app.id === appData.id ? { ...app, ...appData } : app))
    );
    try {
      await upsertApplication(appData);
    } catch {
      toast.error("Failed to save changes.");
      await loadApplications();
    }
  };

  // Handle deleting a card
  const handleDelete = async (id: string) => {
    // Optimistic update
    setApplications((prev) => prev.filter((app) => app.id !== id));
    try {
      await deleteApplication(id);
      toast.success("Application removed.");
    } catch {
      toast.error("Failed to delete application.");
      await loadApplications();
    }
  };

  // Handle adding a new application from the modal
  const handleAddApplication = async (appData: Partial<Application>) => {
    try {
      const newApp = await upsertApplication(appData);
      setApplications((prev) => [...prev, newApp]);
      toast.success("Application added to your tracker!");
    } catch {
      toast.error("Failed to add application.");
    }
  };

  const totalCount = applications.length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-foreground">
              Application Tracker
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Drag cards across columns to update your application pipeline.
            {totalCount > 0 && (
              <span className="ml-2 font-semibold text-brand-600">
                {totalCount} application{totalCount !== 1 ? "s" : ""} tracked.
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Application
        </button>
      </div>

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {["Applied", "Interviewing", "Offer", "Rejected"].map((col) => (
            <div
              key={col}
              className="rounded-2xl border border-border bg-surface/50 overflow-hidden border-t-4 border-t-border"
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-surface">
                <div className="h-4 w-20 rounded-full bg-border animate-pulse" />
                <div className="h-5 w-6 rounded-full bg-border animate-pulse" />
              </div>
              <div className="flex flex-col gap-3 p-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl bg-border/40 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Kanban Board */}
          <KanbanBoard
            applications={applications}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />

          {/* Empty state when no apps at all */}
          {applications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-brand-50 border border-brand-100 text-brand-600">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  No applications yet
                </p>
                <p className="mt-1 text-sm text-muted max-w-xs mx-auto">
                  Start tracking your job search by adding your first application.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add First Application
              </button>
            </div>
          )}
        </>
      )}

      {/* Refresh hint */}
      {!isLoading && applications.length > 0 && (
        <div className="flex items-center justify-end">
          <button
            onClick={loadApplications}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      )}

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddApplication}
      />
    </div>
  );
}
