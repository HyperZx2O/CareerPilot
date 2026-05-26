"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { 
  User, 
  Upload, 
  Briefcase, 
  GraduationCap, 
  Cpu, 
  FolderGit2, 
  ChevronDown, 
  AlertCircle,
  Terminal,
  RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppStore } from "@/store/useAppStore";
import { getCVSections } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SectionConfig {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTION_CONFIGS: SectionConfig[] = [
  { key: "experience", title: "Work Experience", icon: Briefcase },
  { key: "education", title: "Education", icon: GraduationCap },
  { key: "skills", title: "Technical Skills", icon: Cpu },
  { key: "projects", title: "Key Projects", icon: FolderGit2 },
];

export default function ProfilePage() {
  const router = useRouter();
  const { cvId, setCvId, setSessionId } = useAppStore();
  const [sections, setSections] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    experience: true, // Default open the first one
  });

  const fetchSections = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCVSections(id);
      setSections(data || {});
    } catch (err) {
      console.error("Error fetching CV sections:", err);
      setError("Failed to load CV sections. Please try again.");
      toast.error("Failed to load your profile details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cvId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSections(cvId);
    } else {
      setLoading(false);
    }
  }, [cvId, fetchSections]);

  const handleReupload = () => {
    setCvId(null);
    setSessionId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cv_id");
    }
    toast.success("Profile cleared. Redirecting to upload page...");
    router.push("/");
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If no CV is uploaded
  if (!loading && !cvId) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your profile data and view your parsed CV sections.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-8 py-16 text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No CV Uploaded</h3>
            <p className="mt-1 text-sm text-muted max-w-sm">
              You haven&apos;t uploaded a CV yet. Please upload one to view your profile and start using our RAG features.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload CV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <User className="h-6 w-6 text-brand-600" />
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            View the information parsed from your CV. This content grounds all your job match scores and AI assistant interactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {cvId && !loading && (
            <button
              onClick={() => fetchSections(cvId)}
              aria-label="Refresh profile details"
              className="inline-flex items-center justify-center p-2.5 rounded-xl border border-border bg-surface text-muted hover:text-foreground active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          )}
          <button
            onClick={handleReupload}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Re-upload CV
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-border bg-surface/50 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/50 px-8 py-16 text-center gap-4">
          <div className="text-destructive">
            <AlertCircle className="h-10 w-10 mx-auto" />
          </div>
          <p className="text-sm font-medium text-foreground">{error}</p>
          <button
            onClick={() => cvId && fetchSections(cvId)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-505 active:scale-95 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {SECTION_CONFIGS.map(({ key, title, icon: Icon }) => {
            const content = sections?.[key];
            const isDetected = !!content && content.trim().length > 0;
            const isOpen = !!expandedSections[key];

            return (
              <div
                key={key}
                className={cn(
                  "rounded-2xl border bg-surface transition-all duration-200 shadow-sm overflow-hidden",
                  isDetected ? "border-border" : "border-border/50 opacity-75"
                )}
              >
                {/* Accordion Trigger/Header */}
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-foreground focus:outline-none hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border",
                        isDetected 
                          ? "bg-brand-50 border-brand-100 text-brand-600 dark:bg-brand-950/30 dark:border-brand-900 dark:text-brand-400"
                          : "bg-muted border-border text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground">{title}</span>
                      {!isDetected && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (Not Detected)
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Accordion Content */}
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-[1000px] border-t border-border opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                  )}
                >
                  <div className="p-6">
                    {isDetected ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-ul:list-disc prose-ul:pl-5">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted italic">
                        Section not detected in your CV.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debug CV ID Footer */}
      {cvId && (
        <div className="mt-8 flex items-center gap-2 rounded-xl bg-muted/30 border border-border/50 px-4 py-3 text-xs text-muted font-mono justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5" />
            <span>Parsed CV ID:</span>
            <span className="text-foreground select-all">{cvId}</span>
          </div>
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded">
            Debug Info
          </span>
        </div>
      )}
    </div>
  );
}
