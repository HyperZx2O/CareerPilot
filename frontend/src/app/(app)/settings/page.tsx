"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { requestNotificationPermission, getNotificationPermission } from "@/components/providers/ThemeProvider";
import { Palette, Bell, Bot, CheckCircle, AlertTriangle, Ban, RefreshCw, Save } from "lucide-react";

type NotificationPref = "all" | "important" | "none";

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSetting = useAppStore((s) => s.updateSetting);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<"default" | "granted" | "denied">("default");

  useEffect(() => {
    setNotificationStatus(getNotificationPermission() || "default");
  }, []);

  const handleChange = (key: string, val: string | boolean) => {
    // Request notification permission when enabling push notifications
    if (key === "notifications" && val !== "none") {
      requestNotificationPermission().then((granted) => {
        setNotificationStatus(granted ? "granted" : "denied");
      });
    }
    updateSetting(key as keyof typeof settings, val as any);
  };

  const handleToggleWeekly = async () => {
    const newValue = !settings.weekly_report;
    if (newValue) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setMessage({ type: "error", text: "Please allow notifications in your browser to enable weekly reports." });
        return;
      }
    }
    handleChange("weekly_report", newValue);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    await new Promise((r) => setTimeout(r, 500));
    setMessage({ type: "success", text: "Settings saved successfully!" });
    setSaving(false);
  };

  return (
    <div className="animate-slide-up max-w-3xl pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Customize your experience and preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {message && (
          <div className="rounded-xl border p-4 text-sm animate-fade-in flex items-center gap-3"
            style={{
              borderColor: message.type === "success" ? "var(--cp-success)" : "var(--cp-danger)",
              color: message.type === "success" ? "var(--cp-success)" : "var(--cp-danger)",
              background: message.type === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            }}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Appearance */}
        <div className="cp-card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5" style={{ color: "var(--cp-primary)" }} /> Appearance
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Theme</label>
              <select
                className="cp-input w-full md:w-48"
                value={settings.theme}
                onChange={(e) => handleChange("theme", e.target.value)}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="cp-card">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: "var(--cp-primary)" }} /> Notifications
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Push Notifications</label>
              <div className="flex items-center gap-3">
                <select
                  className="cp-input w-full md:w-48"
                  value={settings.notifications}
                  onChange={(e) => handleChange("notifications", e.target.value)}
                >
                  <option value="all">All updates</option>
                  <option value="important">Important only</option>
                  <option value="none">None</option>
                </select>
                <span className="text-xs" style={{ color: "var(--cp-text-dim)" }}>
                  {notificationStatus === "granted" ? (
                    <><CheckCircle className="mr-1 inline h-3 w-3" style={{ color: "var(--cp-success)" }} /> Enabled</>
                  ) : notificationStatus === "denied" ? (
                    <><Ban className="mr-1 inline h-3 w-3" style={{ color: "var(--cp-danger)" }} /> Blocked</>
                  ) : (
                    <><AlertTriangle className="mr-1 inline h-3 w-3" style={{ color: "var(--cp-warning)" }} /> Not set</>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${settings.weekly_report ? "bg-[var(--cp-primary)]" : "bg-[var(--cp-border)]"}`}
                onClick={handleToggleWeekly}
              >
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5 ${settings.weekly_report ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
              <div>
                <p className="text-sm font-medium">Weekly Progress Report</p>
                <p className="text-xs" style={{ color: "var(--cp-text-muted)" }}>Get a summary of your job search every Monday</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI API Keys */}
        <div className="cp-card">
          <div className="border-b pb-4 mb-4" style={{ borderColor: "var(--cp-border)" }}>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5" style={{ color: "var(--cp-primary)" }} /> AI Configuration
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cp-text-muted)" }}>
              Configure AI providers for the AI Assistant. At least one is recommended for full functionality.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
                <label className="text-xs font-semibold block mb-1.5">Groq API Key <span className="text-[var(--cp-primary)]">Recommended</span></label>
              <input
                type="password"
                className="cp-input w-full"
                placeholder="gsk_..."
                value={settings.groq_api_key}
                onChange={(e) => handleChange("groq_api_key", e.target.value)}
              />
              <p className="text-xs mt-1" style={{ color: "var(--cp-text-dim)" }}>Fast & free at console.groq.com</p>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5">NVIDIA NIM API Key</label>
              <input
                type="password"
                className="cp-input w-full"
                placeholder="nvapi-..."
                value={settings.nvidia_api_key}
                onChange={(e) => handleChange("nvidia_api_key", e.target.value)}
              />
              <p className="text-xs mt-1" style={{ color: "var(--cp-text-dim)" }}>High quality at build.nvidia.com</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button type="submit" className="cp-btn cp-btn-primary px-8 py-3 font-semibold text-sm" disabled={saving}>
            {saving ? <><RefreshCw className="mr-1 inline h-4 w-4" /> Saving...</> : <><Save className="mr-1 inline h-4 w-4" /> Save Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
}
