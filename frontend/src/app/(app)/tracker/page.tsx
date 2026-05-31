"use client";

import { useEffect, useState } from "react";
import { getApplications, createApplication, updateApplication, deleteApplication } from "@/lib/api";
import type { Application, ApplicationStatus } from "@/types";

const COLUMNS: { status: ApplicationStatus; label: string; color: string; icon: string }[] = [
  { status: "applied", label: "Applied", color: "#6366f1", icon: "📨" },
  { status: "interviewing", label: "Interviewing", color: "#f59e0b", icon: "🎤" },
  { status: "offer", label: "Offer", color: "#22c55e", icon: "🎉" },
  { status: "rejected", label: "Rejected", color: "#ef4444", icon: "❌" },
];

const DEMO_USER_ID = "demo-user-001";

export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCompany, setFormCompany] = useState("");

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    try {
      const data = await getApplications(DEMO_USER_ID);
      setApps(data);
    } catch {
      // Dev fallback
      setApps([]);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formCompany.trim()) return;
    try {
      const app = await createApplication({
        user_id: DEMO_USER_ID,
        job_title: formTitle,
        company: formCompany,
      });
      setApps((prev) => [app, ...prev]);
    } catch {
      // Optimistic local add
      setApps((prev) => [
        {
          id: Date.now().toString(),
          user_id: DEMO_USER_ID,
          job_title: formTitle,
          company: formCompany,
          location: null,
          deadline: null,
          status: "applied",
          notes: null,
          job_id: null,
          fit_score: null,
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setFormTitle("");
    setFormCompany("");
    setShowForm(false);
  }

  async function handleMove(id: string, newStatus: ApplicationStatus) {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
    try {
      await updateApplication(id, { status: newStatus });
    } catch {
      // Keep optimistic update
    }
  }

  async function handleDelete(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteApplication(id);
    } catch {}
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Application Tracker</h1>
          <p style={{ color: "var(--cp-text-muted)" }}>Kanban board — drag mentally, click to move</p>
        </div>
        <button onClick={() => setShowForm(true)} className="cp-btn cp-btn-primary">
          + Add Application
        </button>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="cp-card mb-6 animate-fade-in">
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-3">
            <input className="cp-input flex-1" placeholder="Job title" value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)} autoFocus />
            <input className="cp-input flex-1" placeholder="Company" value={formCompany}
              onChange={(e) => setFormCompany(e.target.value)} />
            <button type="submit" className="cp-btn cp-btn-primary">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="cp-btn cp-btn-ghost">Cancel</button>
          </form>
        </div>
      )}

      {/* Kanban columns */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colApps = apps.filter((a) => a.status === col.status);
          return (
            <div key={col.status} className="rounded-xl border p-4 min-h-[300px]"
              style={{ background: "var(--cp-surface)", borderColor: "var(--cp-border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <span>{col.icon}</span>
                <h3 className="font-semibold">{col.label}</h3>
                <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: `${col.color}20`, color: col.color }}>
                  {colApps.length}
                </span>
              </div>
              <div className="space-y-3">
                {colApps.map((app) => (
                  <div key={app.id} className="rounded-lg border p-3 animate-fade-in"
                    style={{ background: "var(--cp-surface-2)", borderColor: "var(--cp-border)" }}>
                    <p className="font-medium text-sm">{app.job_title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--cp-text-muted)" }}>{app.company}</p>
                    {app.fit_score !== null && (
                      <span className="cp-badge mt-2" style={{ background: `${col.color}20`, color: col.color }}>
                        Fit: {app.fit_score}%
                      </span>
                    )}
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {COLUMNS.filter((c) => c.status !== app.status).map((c) => (
                        <button key={c.status} onClick={() => handleMove(app.id, c.status)}
                          className="text-xs rounded px-2 py-1 transition-colors"
                          style={{ background: `${c.color}15`, color: c.color }}>
                          → {c.label}
                        </button>
                      ))}
                      <button onClick={() => handleDelete(app.id)}
                        className="text-xs rounded px-2 py-1 ml-auto"
                        style={{ color: "var(--cp-danger)" }}>
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
                {colApps.length === 0 && (
                  <p className="text-center text-xs py-6" style={{ color: "var(--cp-text-dim)" }}>
                    No applications
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
