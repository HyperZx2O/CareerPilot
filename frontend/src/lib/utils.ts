/**
 * Utility helpers used across the CareerPilot frontend.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Tailwind Class Merge ─────────────────────────────────────────────────────

/**
 * Merges Tailwind class names, deduplicating conflicting utilities.
 * Usage: cn("px-4 py-2", isActive && "bg-brand-500")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Formats an ISO date string as "DD MMM YYYY".
 * Returns "—" if the value is null or undefined.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/**
 * Returns true if the deadline is within `days` calendar days from now.
 */
export function isWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

// ─── Salary Formatting ────────────────────────────────────────────────────────

/**
 * Returns a human-readable salary range string.
 * Returns "Not specified" when both min and max are null.
 */
export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null
): string {
  if (min == null && max == null) return "Not specified";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

// ─── Fit Score Helpers ────────────────────────────────────────────────────────

export type FitLevel = "high" | "medium" | "low" | "unknown";

/**
 * Classifies a 0–100 fit score into a level.
 */
export function getFitLevel(score: number | null): FitLevel {
  if (score == null) return "unknown";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

// ─── File Validation ──────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE_MB = 10;

export function validateCVFile(file: File): string | null {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "Only PDF and DOCX files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File size must be under ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Waits for the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
