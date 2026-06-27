/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app
 * nav: N3 side-rail · theme: Cobalt
 * section head: S1 left-margin numbered · feature: F3 tabular spec sheet · CTA: C4 sticky bar
 */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { requestNotificationPermission, getNotificationPermission } from "@/components/providers/ThemeProvider";
import { Palette, Bell, Bot, CheckCircle, AlertTriangle, Ban, RefreshCw, Save } from "lucide-react";

type NotificationPref = "all" | "important" | "none";

function SettingSection({ num, icon, title, children, border = true }: { num: string; icon: React.ReactNode; title: string; children: React.ReactNode; border?: boolean }) {
  return (
    <div className={`flex gap-5 ${border ? "border-b pb-6 mb-6" : ""}`} style={{ borderColor: "var(--color-border)" }}>
      <div className="hidden w-12 shrink-0 pt-0.5 md:block">
        <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-text-dim)" }}>{num}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          <span style={{ color: "var(--color-accent)" }}>{icon}</span>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSetting = useAppStore((s) => s.updateSetting);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<"default" | "granted" | "denied">("default");

  useEffect(() => { setNotificationStatus(getNotificationPermission() || "default"); }, []);

  const handleChange = (key: string, val: string | boolean) => {
    if (key === "notifications" && val !== "none") {
      requestNotificationPermission().then((granted) => setNotificationStatus(granted ? "granted" : "denied"));
    }
    updateSetting(key as keyof typeof settings, val as any);
  };

  const handleToggleWeekly = async () => {
    const newValue = !settings.weekly_report;
    if (newValue) {
      const granted = await requestNotificationPermission();
      if (!granted) { setMessage({ type: "error", text: "Please allow notifications in your browser to enable weekly reports." }); return; }
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
    <div className="pb-24">
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-text)" }}>Settings</h1>
        <p style={{ color: "var(--color-text-muted)" }} className="text-sm">Customize your experience and preferences</p>
      </div>

      <form onSubmit={handleSave}>
        {message && (
          <div className="mb-6 rounded-xl border p-3 text-sm flex items-center gap-3" style={{ borderColor: message.type === "success" ? "var(--color-success)" : "var(--color-accent)", color: message.type === "success" ? "var(--color-success)" : "var(--color-accent)", background: message.type === "success" ? "color-mix(in srgb, var(--color-success) 6%, var(--color-paper))" : "color-mix(in srgb, var(--color-accent) 6%, var(--color-paper))" }}>
            {message.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <p className="font-medium text-xs">{message.text}</p>
          </div>
        )}

        <SettingSection num="01" icon={<Palette className="h-4 w-4" />} title="Appearance">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Theme</label>
            <select
              className="rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              value={settings.theme}
              onChange={(e) => handleChange("theme", e.target.value)}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </SettingSection>

        <SettingSection num="02" icon={<Bell className="h-4 w-4" />} title="Notifications">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Push Notifications</label>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                  value={settings.notifications}
                  onChange={(e) => handleChange("notifications", e.target.value)}
                >
                  <option value="all">All updates</option>
                  <option value="important">Important only</option>
                  <option value="none">None</option>
                </select>
                <span className="text-[10px]" style={{ color: "var(--color-text-dim)" }}>
                  {notificationStatus === "granted" ? <><CheckCircle className="mr-0.5 inline h-2.5 w-2.5" style={{ color: "var(--color-success)" }} /> Enabled</>
                    : notificationStatus === "denied" ? <><Ban className="mr-0.5 inline h-2.5 w-2.5" style={{ color: "var(--color-accent)" }} /> Blocked</>
                    : <><AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" style={{ color: "var(--color-accent)" }} /> Not set</>}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--color-text)" }}>Weekly Progress Report</p>
                <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Get a summary every Monday</p>
              </div>
              <button
                type="button"
                className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${settings.weekly_report ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
                onClick={handleToggleWeekly}
              >
                <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform absolute top-0.5 ${settings.weekly_report ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </SettingSection>

        <SettingSection num="03" icon={<Bot className="h-4 w-4" />} title="AI Configuration" border={false}>
          <p className="mb-4 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            Configure AI providers for the AI Assistant. At least one is recommended for full functionality.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>Groq API Key <span style={{ color: "var(--color-accent)" }}>Recommended</span></label>
              <input type="password" className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="gsk_..." value={settings.groq_api_key} onChange={(e) => handleChange("groq_api_key", e.target.value)} />
              <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}>Fast & free at console.groq.com</p>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>NVIDIA NIM API Key</label>
              <input type="password" className="w-full rounded-xl border bg-[var(--color-paper-2)] px-3 py-2 text-xs outline-none transition-all focus:border-[var(--color-accent)]" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }} placeholder="nvapi-..." value={settings.nvidia_api_key} onChange={(e) => handleChange("nvidia_api_key", e.target.value)} />
              <p className="mt-1 text-[10px]" style={{ color: "var(--color-text-dim)" }}>High quality at build.nvidia.com</p>
            </div>
          </div>
        </SettingSection>
      </form>

      {/* Sticky save bar */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-40 border-t md:left-64"
        style={{ background: "var(--color-paper)", borderColor: "var(--color-border)" }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>Changes are saved locally</p>
          <button
            type="submit"
            onClick={handleSave}
            className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--color-accent)" }}
            disabled={saving}
          >
            {saving ? <><RefreshCw className="mr-1 inline h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-1 inline h-4 w-4" /> Save Settings</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
