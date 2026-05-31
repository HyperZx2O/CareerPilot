// Canonical TypeScript types matching master-spec.md Section 6

export interface User {
  id: string;
  email: string;
  full_name: string;
  clerk_id: string;
  created_at: string;
  updated_at: string;
}

export interface CV {
  id: string;
  user_id: string;
  file_name: string;
  file_type: "pdf" | "docx";
  sections_found: string[];
  processing_status: "pending" | "processing" | "complete" | "failed";
  created_at: string;
  updated_at: string;
}

export interface CVChunk {
  id: string;
  cv_id: string;
  section: "experience" | "education" | "skills" | "projects" | "summary" | "other";
  content: string;
  chroma_vector_id: string;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  deadline: string | null;
  description: string;
  url: string;
  source: string;
  fit_score: number | null;
  fit_reasons: string[];
  gap_reasons: string[];
  fetched_at: string;
}

export type ApplicationStatus = "applied" | "interviewing" | "offer" | "rejected";

export interface Application {
  id: string;
  user_id: string;
  job_title: string;
  company: string;
  location: string | null;
  deadline: string | null;
  status: ApplicationStatus;
  notes: string | null;
  job_id: string | null;
  fit_score: number | null;
  applied_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  query_type: "readiness" | "gap" | "roadmap" | "cover_letter" | "general" | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_date: string | null;
  progress: number;
  created_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface DashboardStats {
  applications_this_week: number;
  applications_last_week: number;
  skills_count: number;
  roadmap_progress: number;
  streak_days: number;
}

export interface NudgeResponse {
  message: string | null;
  jobs: Job[];
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

export interface ActivityLog {
  id: string;
  user_id: string;
  action: ActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}
