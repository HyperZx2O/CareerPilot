import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: {
    default: "CareerPilot",
    template: "%s | CareerPilot",
  },
};

/**
 * Layout for all protected app pages.
 * Wraps children in the AppShell (Sidebar + TopBar) and ErrorBoundary.
 * Auth protection will be added via Clerk middleware in a future phase.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
