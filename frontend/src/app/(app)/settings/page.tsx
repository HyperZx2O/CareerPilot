import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your account, notifications, and data preferences.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-surface/50 px-8 py-16 text-center">
        <p className="text-sm text-muted">Settings UI will be built in Phase 9.</p>
      </div>
    </div>
  );
}
