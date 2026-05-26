"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string | null;
}

/**
 * App shell wrapping all protected pages.
 * Composes the fixed Sidebar + TopBar with a scrollable main content area.
 * Adds route guard redirecting to /onboarding if no CV is uploaded yet.
 */
export function AppShell({ children, userName }: AppShellProps) {
  const router = useRouter();
  const { cvId, sidebarCollapsed, toggleSidebar } = useAppStore();

  useEffect(() => {
    if (!cvId) {
      router.replace("/onboarding");
    }
  }, [cvId, router]);

  // Prevent flash of protected page content while redirecting
  if (!cvId) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Mobile Sidebar Drawer Backdrop ── */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* ── Sidebar (fixed/drawer on mobile, static on desktop) ── */}
      <Sidebar />

      {/* ── Main content area ── */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300"
        )}
      >
        <TopBar userName={userName} />

        {/* Scrollable page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-background px-6 py-8"
        >
          <div className="mx-auto w-full max-w-[1200px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
