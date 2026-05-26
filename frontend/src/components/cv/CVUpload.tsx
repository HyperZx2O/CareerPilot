"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { uploadCV } from "@/lib/api";
import { validateCVFile } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState =
  | { stage: "idle" }
  | { stage: "selected"; file: File }
  | { stage: "uploading"; file: File }
  | { stage: "success"; file: File; cvId: string; sections: string[] }
  | { stage: "error"; file: File; message: string };

interface CVUploadProps {
  /** Called when upload + processing succeeds */
  onSuccess?: (cvId: string, sections: string[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CVUpload({ onSuccess }: CVUploadProps) {
  const router = useRouter();
  const setCvId = useAppStore((s) => s.setCvId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({ stage: "idle" });

  // ── File selection ──────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const error = validateCVFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setState({ stage: "selected", file });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected after error
    e.target.value = "";
  };

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (state.stage !== "selected") return;
    const { file } = state;
    setState({ stage: "uploading", file });

    try {
      const { cv_id, sections_found } = await uploadCV(file);

      // Persist cv_id globally
      setCvId(cv_id);

      setState({
        stage: "success",
        file,
        cvId: cv_id,
        sections: sections_found,
      });

      toast.success("CV uploaded successfully!");
      onSuccess?.(cv_id, sections_found);

      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Upload failed — please try a PDF or DOCX file.";
      setState({ stage: "error", file, message });
      toast.error("Upload failed — please try a PDF or DOCX file.");
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setState({ stage: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  // SUCCESS state
  if (state.stage === "success") {
    return (
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-500" aria-hidden="true" />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">CV uploaded successfully!</h2>
          <p className="mt-1 text-sm text-muted">
            Redirecting you to your dashboard in a moment…
          </p>
        </div>

        {/* Detected sections */}
        <div className="w-full rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-900/20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
            Sections detected
          </p>
          <div className="flex flex-wrap gap-2">
            {state.sections.length > 0 ? (
              state.sections.map((section) => (
                <span
                  key={section}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-green-700 shadow-sm dark:bg-green-900/40 dark:text-green-300"
                >
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {section}
                </span>
              ))
            ) : (
              <p className="text-xs text-muted">No sections detected — try re-uploading.</p>
            )}
          </div>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Go to Dashboard now
        </button>
      </div>
    );
  }

  // UPLOADING state
  if (state.stage === "uploading") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 animate-fade-in">
        <Spinner size="h-10 w-10" label="Uploading CV…" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Analysing your CV…</p>
          <p className="mt-1 text-xs text-muted">
            Identifying sections, building your profile…
          </p>
        </div>
        {/* File info */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted">
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.file.name}</span>
          <span>·</span>
          <span>{formatBytes(state.file.size)}</span>
        </div>
      </div>
    );
  }

  // IDLE / SELECTED / ERROR states — drop zone UI
  const isSelected = state.stage === "selected" || state.stage === "error";
  const selectedFile = isSelected ? state.file : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id="cv-file-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Upload CV file"
      />

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drag and drop CV here, or click to browse"
        onClick={() => !isSelected && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isSelected) fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer select-none",
          isDragOver
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 scale-[1.01]"
            : isSelected
            ? "border-brand-400 bg-brand-50/50 dark:bg-brand-900/10 cursor-default"
            : "border-border bg-surface hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10"
        )}
      >
        {/* Error icon overlay */}
        {state.stage === "error" && (
          <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            Upload failed
          </div>
        )}

        {/* Icon */}
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
            isDragOver ? "bg-brand-100 dark:bg-brand-900/40" : "bg-border"
          )}
        >
          <UploadCloud
            className={cn(
              "h-7 w-7 transition-colors",
              isDragOver ? "text-brand-600" : "text-muted"
            )}
            aria-hidden="true"
          />
        </div>

        {/* Text */}
        {!isSelected ? (
          <>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drag &amp; drop your CV here
              </p>
              <p className="mt-1 text-xs text-muted">
                or{" "}
                <span className="font-medium text-brand-600 underline underline-offset-2">
                  click to browse
                </span>
              </p>
            </div>
            <p className="text-xs text-muted">
              Supports <strong>PDF</strong> and <strong>DOCX</strong> · Max 10 MB
            </p>
          </>
        ) : (
          /* File selected — show file info */
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 shadow-sm dark:bg-surface">
              <FileText className="h-5 w-5 text-brand-500" aria-hidden="true" />
              <div className="text-left">
                <p className="max-w-[200px] truncate text-xs font-semibold text-foreground">
                  {selectedFile!.name}
                </p>
                <p className="text-xs text-muted">{formatBytes(selectedFile!.size)}</p>
              </div>
              {/* Remove file */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="ml-2 rounded-md p-0.5 text-muted transition-colors hover:bg-border hover:text-foreground"
                aria-label="Remove selected file"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-muted">
              Drop a different file here to replace, or remove above
            </p>
          </div>
        )}
      </div>

      {/* Upload button — only shown when file is selected */}
      {isSelected && (
        <button
          id="cv-upload-btn"
          type="button"
          onClick={handleUpload}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-700 hover:shadow-brand-500/30 active:scale-[0.98]"
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          Upload &amp; Analyse CV
        </button>
      )}

      {/* Retry button on error */}
      {state.stage === "error" && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-1 text-center text-xs text-muted underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Try a different file
        </button>
      )}
    </div>
  );
}
