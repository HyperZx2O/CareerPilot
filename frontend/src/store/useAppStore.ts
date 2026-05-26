"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface AppStore {
  // ── CV & Session ──────────────────────────────────────────────────────────
  /** ID of the most-recently successfully processed CV. */
  cvId: string | null;
  setCvId: (id: string | null) => void;

  /** Current chat session ID. */
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  // ── UI State ──────────────────────────────────────────────────────────────
  /** Whether the navigation sidebar is collapsed (mobile / user preference). */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * Global Zustand store persisted to localStorage under the key "careerpilot-store".
 * Re-hydrated automatically on page load via the `persist` middleware.
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // CV & Session
      cvId: null,
      setCvId: (id) => set({ cvId: id }),

      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),

      // UI
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: "careerpilot-store",
      // Only persist these keys — avoid leaking transient state
      partialize: (state) => ({
        cvId: state.cvId,
        sessionId: state.sessionId,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
