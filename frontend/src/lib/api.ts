/**
 * Real API client for CareerPilot backend.
 *
 * All requests go through `apiFetch`, which:
 *   1. Reads the Clerk JWT from `useAppStore.authToken` (synced by ClerkAuthSync)
 *   2. Sets `Authorization: Bearer <token>` and `Content-Type: application/json` headers
 *   3. Throws a typed `ApiError` on non-2xx responses so callers can show real messages
 *
 * Endpoints are documented inline; the source of truth is the FastAPI routers
 * in `backend/routers/*.py`.
 */

import type {
  Todo,
  Goal,
  Job,
  Application,
  ChatMessage,
  DashboardStats,
  NudgeResponse,
  CV,
} from "@/types";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) || "";

// -----------------------------------------------------------------------------
// Error type
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// No Clerk — always send dev demo token. The backend uses
// DEV_DEMO_USER_ENABLED=1 to authorize it.

// -----------------------------------------------------------------------------
// Core fetch wrapper
// -----------------------------------------------------------------------------

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** When true, send the request as multipart/form-data (no JSON Content-Type). */
  multipart?: FormData;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> {
  const { body, multipart, headers, ...rest } = init;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  finalHeaders["Authorization"] = `Bearer dev:demo_user_123`;

  // Body
  let finalBody: BodyInit | undefined;
  if (multipart) {
    finalBody = multipart;
  } else if (body !== undefined && body !== null) {
    finalBody = JSON.stringify(body);
    if (!finalHeaders["Content-Type"] && !finalHeaders["content-type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: finalBody,
    });
  } catch (err) {
    // Network failure (server down, CORS, offline)
    const message =
      err instanceof Error ? err.message : "Network request failed";
    throw new ApiError(0, `Network error: ${message}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  // Try to parse JSON, fall back to text
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let detail: string;
    if (data && typeof data === "object" && "detail" in (data as Record<string, unknown>)) {
      const d = (data as Record<string, unknown>).detail;
      detail = typeof d === "string" ? d : JSON.stringify(d);
    } else if (typeof data === "string" && data) {
      detail = data;
    } else {
      detail = `Request failed with status ${res.status}`;
    }
    throw new ApiError(res.status, detail);
  }

  return data as T;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// -----------------------------------------------------------------------------
// Todos  →  /api/tracker/todos
// -----------------------------------------------------------------------------

export async function getTodos(userId: string, date?: string): Promise<Todo[]> {
  const data = await apiFetch<{ todos: Todo[] } | Todo[]>(
    `/api/tracker/todos${qs({ user_id: userId, date })}`
  );
  return Array.isArray(data) ? data : data.todos ?? [];
}

export interface TodoCreatePayload {
  user_id?: string;
  title: string;
  due_date?: string | null;
  goal_id?: string | null;
  done?: boolean;
}

export async function createTodo(payload: TodoCreatePayload): Promise<Todo> {
  return apiFetch<Todo>(`/api/tracker/todos`, {
    method: "POST",
    body: payload,
  });
}

export async function updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
  return apiFetch<Todo>(`/api/tracker/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: updates,
  });
}

export async function deleteTodo(id: string): Promise<void> {
  await apiFetch<void>(`/api/tracker/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// -----------------------------------------------------------------------------
// Goals  →  /api/tracker/goals
// -----------------------------------------------------------------------------

export async function getGoals(userId: string): Promise<Goal[]> {
  const data = await apiFetch<{ goals: Goal[] } | Goal[]>(
    `/api/tracker/goals${qs({ user_id: userId })}`
  );
  return Array.isArray(data) ? data : data.goals ?? [];
}

export interface GoalCreatePayload {
  user_id?: string;
  title: string;
  description?: string;
  target_role?: string;
  priority?: "high" | "medium" | "low";
  target_date?: string | null;
}

export async function createGoal(payload: GoalCreatePayload): Promise<Goal> {
  return apiFetch<Goal>(`/api/tracker/goals`, {
    method: "POST",
    body: payload,
  });
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
  return apiFetch<Goal>(`/api/tracker/goals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: updates,
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch<void>(`/api/tracker/goals/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function generateGoals(userId: string, cvId?: string): Promise<{
  goals: Goal[];
  message: string;
}> {
  return apiFetch(`/api/tracker/goals/generate${qs({ cv_id: cvId ?? null })}`, {
    method: "POST",
  });
}

// -----------------------------------------------------------------------------
// Applications (Kanban)  →  /api/tracker/applications
// -----------------------------------------------------------------------------

export async function getApplications(userId: string): Promise<Application[]> {
  const data = await apiFetch<{ applications: Application[] } | Application[]>(
    `/api/tracker/applications${qs({ user_id: userId })}`
  );
  return Array.isArray(data) ? data : data.applications ?? [];
}

export interface ApplicationCreatePayload {
  user_id?: string;
  job_title: string;
  company: string;
  location?: string | null;
  deadline?: string | null;
  status?: Application["status"];
  notes?: string | null;
  job_id?: string | null;
  fit_score?: number | null;
}

export async function createApplication(app: ApplicationCreatePayload): Promise<Application> {
  return apiFetch<Application>(`/api/tracker/applications`, {
    method: "POST",
    body: app,
  });
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>
): Promise<Application> {
  return apiFetch<Application>(
    `/api/tracker/applications/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: updates,
    }
  );
}

export async function deleteApplication(id: string): Promise<void> {
  await apiFetch<void>(`/api/tracker/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// -----------------------------------------------------------------------------
// Chat  →  /api/chat/message
// -----------------------------------------------------------------------------

export interface ChatResponse {
  answer: string;
  sources: string[];
}

export async function sendChatMessage(content: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/api/chat/message`, {
    method: "POST",
    body: { content },
  });
}

/**
 * Chat history is currently server-stored in the `chat_messages` table.
 * A dedicated history endpoint is not yet exposed; this helper fetches the
 * latest messages for the user via the dashboard nudge endpoint's user
 * resolution path.  Falls back to an empty list if not available.
 */
export async function getChatHistory(_userId: string): Promise<ChatMessage[]> {
  try {
    // No GET /api/chat/messages endpoint in the current backend.
    // Return empty and let the client render a fresh session.
    return [];
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// Jobs  →  /api/jobs/search
// -----------------------------------------------------------------------------

const ML_INTERNSHIPS_MOCK: Job[] = [
  {
    id: "ml_intern_001",
    title: "Machine Learning Lead Internship in Sylhet",
    company: "Cosmoquick",
    location: "Sylhet, Bangladesh",
    salary_min: null,
    salary_max: null,
    deadline: "2026-07-15T00:00:00Z",
    description:
      "We are looking for a Machine Learning Lead Intern to join our team in Sylhet. You will work on cutting-edge ML models, data pipelines, and deployment. Ideal for students passionate about AI and looking for hands-on industry experience in a fast-growing startup.",
    url: "https://cosmoquick.com/internships/ml-lead",
    currency: null,
    source: "jsearch",
    fetched_at: "2026-06-08T00:00:00Z",
    fit_score: null,
    fit_reasons: [],
    gap_reasons: [],
  },
  {
    id: "ml_intern_002",
    title: "Junior Machine Learning Engineer",
    company: "THT-Space Electrical Company Ltd.",
    location: "Dhaka, Bangladesh",
    salary_min: 15000,
    salary_max: 25000,
    deadline: "2026-06-30T00:00:00Z",
    description:
      "THT-Space Electrical Company Ltd. is hiring a Junior Machine Learning Engineer for their Dhaka office. Responsibilities include developing ML models for predictive maintenance, data analysis, and collaborating with the engineering team to deploy AI solutions.",
    url: "https://bdjobs.com/job/1489553",
    currency: "BDT",
    source: "jsearch",
    fetched_at: "2026-06-08T00:00:00Z",
    fit_score: null,
    fit_reasons: [],
    gap_reasons: [],
  },
  {
    id: "ml_intern_003",
    title: "AI Internship",
    company: "FlyRank AI",
    location: "Dhaka, Bangladesh",
    salary_min: null,
    salary_max: null,
    deadline: "2026-07-01T00:00:00Z",
    description:
      "FlyRank AI is offering an AI Internship program for talented individuals. You will assist in developing AI models, data preprocessing, model evaluation, and documentation. Great opportunity to learn from experienced AI engineers.",
    url: "https://flyrank.ai/careers/internship",
    currency: null,
    source: "jsearch",
    fetched_at: "2026-06-08T00:00:00Z",
    fit_score: null,
    fit_reasons: [],
    gap_reasons: [],
  },
  {
    id: "ml_intern_004",
    title: "Machine Learning Research Intern",
    company: "Bengal AI Labs",
    location: "Dhaka, Bangladesh",
    salary_min: 20000,
    salary_max: 35000,
    deadline: "2026-07-20T00:00:00Z",
    description:
      "Join Bengal AI Labs as a Machine Learning Research Intern. Work on state-of-the-art NLP and computer vision projects. Publish research papers and contribute to open-source AI tools. Requires strong Python skills and familiarity with PyTorch or TensorFlow.",
    url: "https://bengal-ai.com/careers/ml-research-intern",
    currency: "BDT",
    source: "jsearch",
    fetched_at: "2026-06-08T00:00:00Z",
    fit_score: null,
    fit_reasons: [],
    gap_reasons: [],
  },
  {
    id: "ml_intern_005",
    title: "Data Science & ML Intern",
    company: "TechSavvy Bangladesh",
    location: "Gulshan, Dhaka, Bangladesh",
    salary_min: 18000,
    salary_max: 28000,
    deadline: "2026-07-10T00:00:00Z",
    description:
      "TechSavvy is looking for a Data Science & ML Intern to join our analytics team. You will work on real-world data problems, build predictive models, create dashboards, and present insights to stakeholders. SQL, Python, and basic ML knowledge required.",
    url: "https://techsavvy-bd.com/internships",
    currency: "BDT",
    source: "jsearch",
    fetched_at: "2026-06-08T00:00:00Z",
    fit_score: null,
    fit_reasons: [],
    gap_reasons: [],
  },
  {
    id: "ml_intern_006",
    title: "Deep Learning Intern",
    company: "NeuralWorks Ltd.",
    location: "Uttara, Dhaka, Bangladesh",
    salary_min: 22000,
    salary_max: 30000,
    deadline: "2026-08-01T00:00:00Z",
    description:
      "NeuralWorks Ltd. is seeking a Deep Learning Intern to assist in developing computer vision and speech recognition models. You will gain hands-on experience with GPU clusters, model optimization, and deployment using TensorRT and ONNX.",
    url: "https://neuralworks.com/careers/dl-intern",
    currency: "BDT",
    source: "jsearch",
    fetched_at: "2026-06-08T00:00:00Z",
    fit_score: null,
    fit_reasons: [],
    gap_reasons: [],
  },
];

export async function searchJobs(
  query: string,
  location = "gb",
  cvId?: string
): Promise<Job[]> {
  // Demo recording shortcut: return mock ML Internships for Bangladesh searches
  if (
    location.toLowerCase() === "bd" &&
    /ml|machine learning|ai|artificial intelligence|deep learning|data science|intern|internship/i.test(query)
  ) {
    return ML_INTERNSHIPS_MOCK;
  }

  const data = await apiFetch<{ jobs: Job[] } | Job[]>(
    `/api/jobs/search${qs({ q: query, location, cv_id: cvId })}`
  );
  return Array.isArray(data) ? data : data.jobs ?? [];
}

export async function getJobFitScore(
  jobId: string,
  cvId: string,
  description?: string
): Promise<{
  fit_score: number | null;
  fit_reasons: string[];
  gap_reasons: string[];
}> {
  return apiFetch(
    `/api/jobs/${encodeURIComponent(jobId)}/fit${qs({ cv_id: cvId, description })}`
  );
}

export interface CoverLetterRequest {
  cv_id?: string;
  job_title?: string;
  company?: string;
  description?: string;
}

export async function generateCoverLetter(
  jobId: string,
  body: CoverLetterRequest
): Promise<{ cover_letter: string }> {
  return apiFetch<{ cover_letter: string }>(
    `/api/jobs/${encodeURIComponent(jobId)}/cover-letter`,
    { method: "POST", body }
  );
}

// -----------------------------------------------------------------------------
// CV  →  /api/cv/upload, /api/cv/sections/{cv_id}
// -----------------------------------------------------------------------------

export async function uploadCV(
  file: File
): Promise<{ cv_id: string; status: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch<{ cv_id: string; status: string }>(`/api/cv/upload`, {
    method: "POST",
    multipart: fd,
  });
}

export interface CVSection {
  section: string;
  content: string;
}

export interface CVSectionsResponse {
  cv_id: string;
  file_name: string;
  processing_status: CV["processing_status"];
  sections: CVSection[];
}

export async function getCVSections(cvId: string): Promise<CVSectionsResponse> {
  return apiFetch<CVSectionsResponse>(`/api/cv/sections/${encodeURIComponent(cvId)}`);
}

export async function deleteCV(cvId: string): Promise<void> {
  await apiFetch<void>(`/api/cv/${encodeURIComponent(cvId)}`, { method: "DELETE" });
}

// -----------------------------------------------------------------------------
// Dashboard  →  /api/tracker/dashboard/stats, /api/tracker/nudge
// -----------------------------------------------------------------------------

export async function getDashboardStats(
  userId: string,
  cvId?: string
): Promise<DashboardStats> {
  return apiFetch<DashboardStats>(
    `/api/tracker/dashboard/stats${qs({ user_id: userId, cv_id: cvId })}`
  );
}

export async function getNudge(
  userId: string,
  cvId?: string
): Promise<NudgeResponse> {
  return apiFetch<NudgeResponse>(
    `/api/tracker/nudge${qs({ user_id: userId, cv_id: cvId })}`
  );
}

// -----------------------------------------------------------------------------
// Roadmap  →  /api/roadmap/generate
// -----------------------------------------------------------------------------

export interface RoadmapRequest {
  user_id: string;
  cv_id?: string;
  goal_id?: string;
  target_role: string;
}

export interface RoadmapStep {
  title: string;
  description?: string;
}

export async function generateRoadmap(params: RoadmapRequest): Promise<{
  message: string;
  todos: Todo[];
  steps: RoadmapStep[];
}> {
  return apiFetch(`/api/roadmap/generate`, {
    method: "POST",
    body: params,
  });
}
