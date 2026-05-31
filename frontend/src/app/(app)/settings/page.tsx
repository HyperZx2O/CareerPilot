"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSettings, type ApiSettings } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ApiSettings>({
    DATABASE_URL: "",
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    PINECONE_API_KEY: "",
    PINECONE_INDEX: "",
    PINECONE_ENV: "",
    OPENAI_API_KEY: "",
    GEMINI_API_KEY: "",
    ADZUNA_APP_ID: "",
    ADZUNA_APP_KEY: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const s = await getSettings();
        setSettings(s);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (key: keyof ApiSettings, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateSettings(settings);
      setMessage({ type: "success", text: res.message || "Settings updated successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to update settings. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--cp-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="animate-slide-up max-w-4xl pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p style={{ color: "var(--cp-text-muted)" }}>Configure your API integration keys and system preferences</p>
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
            <span>{message.type === "success" ? "✨" : "⚠️"}</span>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* API Credentials */}
        <div className="cp-card">
          <div className="border-b pb-4 mb-6" style={{ borderColor: "var(--cp-border)" }}>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>🔌</span> API Keys & Third-party Integrations
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--cp-text-muted)" }}>
              Values entered here are dynamically synced and written back to your workspace <code>.env</code> file.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* LLMs */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--cp-primary-hover)" }}>
                <span>🤖</span> Large Language Models (LLM)
              </h3>
              
              <div>
                <label className="text-xs font-semibold block mb-1.5">Gemini API Key</label>
                <input
                  type="password"
                  className="cp-input w-full"
                  placeholder="AIzaSy..."
                  value={settings.GEMINI_API_KEY}
                  onChange={(e) => handleChange("GEMINI_API_KEY", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5">OpenAI API Key</label>
                <input
                  type="password"
                  className="cp-input w-full"
                  placeholder="sk-proj-..."
                  value={settings.OPENAI_API_KEY}
                  onChange={(e) => handleChange("OPENAI_API_KEY", e.target.value)}
                />
              </div>
            </div>

            {/* Pinecone */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--cp-accent)" }}>
                <span>🌲</span> Vector Database (Pinecone)
              </h3>
              
              <div>
                <label className="text-xs font-semibold block mb-1.5">Pinecone API Key</label>
                <input
                  type="password"
                  className="cp-input w-full"
                  placeholder="pcsk_..."
                  value={settings.PINECONE_API_KEY}
                  onChange={(e) => handleChange("PINECONE_API_KEY", e.target.value)}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Index Name</label>
                  <input
                    type="text"
                    className="cp-input w-full text-sm"
                    placeholder="careerpilot-cv"
                    value={settings.PINECONE_INDEX}
                    onChange={(e) => handleChange("PINECONE_INDEX", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Environment</label>
                  <input
                    type="text"
                    className="cp-input w-full text-sm"
                    placeholder="us-east-1"
                    value={settings.PINECONE_ENV}
                    onChange={(e) => handleChange("PINECONE_ENV", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Adzuna */}
            <div className="space-y-4 md:col-span-2 pt-4 border-t" style={{ borderColor: "var(--cp-border)" }}>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--cp-warning)" }}>
                <span>💼</span> Adzuna Job Search API
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold block mb-1.5">App ID</label>
                  <input
                    type="text"
                    className="cp-input w-full"
                    placeholder="8e327818"
                    value={settings.ADZUNA_APP_ID}
                    onChange={(e) => handleChange("ADZUNA_APP_ID", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5">App Key</label>
                  <input
                    type="password"
                    className="cp-input w-full"
                    placeholder="6119a6d13f2e55..."
                    value={settings.ADZUNA_APP_KEY}
                    onChange={(e) => handleChange("ADZUNA_APP_KEY", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Supabase */}
            <div className="space-y-4 md:col-span-2 pt-4 border-t" style={{ borderColor: "var(--cp-border)" }}>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--cp-success)" }}>
                <span>⚡</span> Database (PostgreSQL / Supabase)
              </h3>
              
              <div>
                <label className="text-xs font-semibold block mb-1.5">PostgreSQL DATABASE_URL</label>
                <input
                  type="text"
                  className="cp-input w-full font-mono text-xs"
                  placeholder="postgresql://postgres:password@host:5432/postgres"
                  value={settings.DATABASE_URL}
                  onChange={(e) => handleChange("DATABASE_URL", e.target.value)}
                />
                <p className="text-xs mt-1" style={{ color: "var(--cp-text-dim)" }}>
                  If left blank, sqlite fallback database (sqlite+aiosqlite:///careerpilot.db) will automatically be used locally.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Supabase URL</label>
                  <input
                    type="text"
                    className="cp-input w-full"
                    placeholder="https://xyz.supabase.co"
                    value={settings.SUPABASE_URL}
                    onChange={(e) => handleChange("SUPABASE_URL", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Supabase Anon Key</label>
                  <input
                    type="password"
                    className="cp-input w-full"
                    placeholder="eyJhbGci..."
                    value={settings.SUPABASE_ANON_KEY}
                    onChange={(e) => handleChange("SUPABASE_ANON_KEY", e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3">
          <button type="submit" className="cp-btn cp-btn-primary px-8 py-3 font-semibold text-sm" disabled={saving}>
            {saving ? "🔄 Saving and Reloading..." : "💾 Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
