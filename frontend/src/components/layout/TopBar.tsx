"use client";

import { Bell, Menu } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface TopBarProps {
  /** Optional user display name shown in the top bar */
  userName?: string | null;
}

/**
 * Fixed top bar shown across all protected app pages.
 * Shows the hamburger toggle (mobile), page context, and user info.
 */
export function TopBar({ userName }: TopBarProps) {
  const { toggleSidebar } = useAppStore();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      {/* ── Left: mobile hamburger ── */}
      <button
        onClick={toggleSidebar}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-border hover:text-foreground md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* ── Centre: logo text on mobile ── */}
      <span className="text-sm font-bold tracking-tight text-foreground md:hidden">
        CareerPilot
      </span>

      {/* ── Right: actions ── */}
      <div className="ml-auto flex items-center gap-2">
        {/* Notification bell (future feature placeholder) */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-border hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* User avatar / name */}
        {userName && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium text-foreground sm:block">
              {userName}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
