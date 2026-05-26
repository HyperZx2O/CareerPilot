// ─── Shared TypeScript Interfaces ────────────────────────────────────────────
// Mirrors the canonical data models defined in master-spec.md § 6.
// All backend Pydantic schemas and these interfaces must remain in sync.

export interface User {
  id: string; // UUID, from Clerk
  email: string;
  full_name: string;
  clerk_id: string; // Clerk user ID
  created_at: string; // ISO 8601
  updated_at: string;
}

export interface CV {
  id: string; // UUID
  user_id: string;
  file_name: string;
  file_type: "pdf" | "docx";
  sections_found: string[]; // ["experience", "education", "skills", "projects"]
  processing_status: "pending" | "processing" | "complete" | "failed";
  created_at: string;
  updated_at: string;
}

export interface CVChunk {
  id: string; // UUID
  cv_id: string;
  section:
    | "experience"
    | "education"
    | "skills"
    | "projects"
    | "summary"
    | "other";
  content: string; // Raw text of the chunk
  chroma_vector_id: string; // ID in ChromaDB
  created_at: string;
}

export interface Job {
  id: string; // JSearch job ID
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  deadline: string | null; // ISO 8601 date
  description: string;
  url: string;
  source: string; // "jsearch" | "adzuna" | "manual"
  fit_score: number | null; // 0–100, null if cv_id not provided
  fit_reasons: string[];
  gap_reasons: string[];
  fetched_at: string;
}

export interface Application {
  id: string; // UUID
  user_id: string;
  job_title: string;
  company: string;
  location: string | null;
  deadline: string | null; // ISO date YYYY-MM-DD
  status: "applied" | "interviewing" | "offer" | "rejected";
  notes: string | null;
  job_id: string | null; // JSearch ID if sourced from search
  fit_score: number | null;
  applied_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string; // UUID
  user_id: string;
  cv_id: string;
  created_at: string;
  last_active_at: string;
}

export interface ChatMessage {
  id: string; // UUID
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[]; // CV section names used (assistant messages only)
  query_type:
    | "readiness"
    | "gap"
    | "roadmap"
    | "cover_letter"
    | "general"
    | null;
  created_at: string;
}

export interface Goal {
  id: string; // UUID
  user_id: string;
  title: string;
  target_date: string | null; // ISO date YYYY-MM-DD
  progress: number; // 0–100
  created_at: string;
}

export interface Todo {
  id: string; // UUID
  user_id: string;
  goal_id: string | null;
  title: string;
  due_date: string | null; // ISO date YYYY-MM-DD
  done: boolean;
  created_at: string;
}

export interface DashboardStats {
  applications_this_week: number;
  applications_last_week: number;
  skills_count: number;
  roadmap_progress: number; // 0–100
  streak_days: number;
  total_applications: number;
}

export interface ActivityLog {
  id: string; // UUID
  user_id: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ActivityAction =
  | "cv_uploaded"
  | "job_searched"
  | "application_created"
  | "application_updated"
  | "application_deleted"
  | "chat_message_sent"
  | "todo_completed"
  | "goal_created";

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface UploadCVResponse {
  cv_id: string;
  sections_found: string[];
}

export interface NudgeResponse {
  message: string;
  jobs: Job[];
}
