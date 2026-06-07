import type { Todo, Goal, Job, Application, ChatMessage } from "@/types";

// Todo CRUD
export async function getTodos(userId: string): Promise<any> { return []; }
export async function createTodo(payload: { user_id: string; title: string; due_date: string | null; goal_id?: string | null; done?: boolean; created_at?: string }): Promise<any> { return { id: "t1", ...payload, goal_id: payload.goal_id ?? null, done: payload.done ?? false, created_at: payload.created_at ?? new Date().toISOString() }; }
export async function updateTodo(id: string, updates: Partial<Todo>): Promise<void> {}
export async function deleteTodo(id: string): Promise<void> {}

// Goal CRUD
export async function getGoals(userId: string): Promise<any> { return []; }
export async function createGoal(payload: { user_id: string; title: string; description?: string; target_role?: string; priority?: string }): Promise<any> { return { id: "g1", ...payload, description: payload.description ?? "", target_role: payload.target_role ?? "", priority: payload.priority ?? "medium" }; }
export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {}
export async function deleteGoal(id: string): Promise<void> {}

// Application CRUD
export async function getApplications(userId: string): Promise<any> { return []; }
export async function createApplication(app: Application): Promise<any> { return { ...app, id: "a1" }; }
export async function updateApplication(id: string, updates: Partial<Application>): Promise<void> {}
export async function deleteApplication(id: string): Promise<void> {}

// Chat
export async function sendChatMessage(message: string): Promise<{ answer: string; sources?: string[] }> { return { answer: `Echo: ${message}`, sources: [] }; }

// Jobs
export async function searchJobs(query: string, location?: string, cvId?: string): Promise<any> { return []; }
export async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> { return {} as T; }

// CV
export async function uploadCV(file: File): Promise<{ cv_id: string; status: string }> { return { cv_id: "dummy", status: "uploaded" }; }
export async function getCVSections(userId: string): Promise<any> { return { sections: [] }; }

// Misc
export async function getDashboardStats(userId: string, cvId?: string): Promise<any> { return {}; }
export async function getNudge(userId: string, cvId?: string): Promise<any> { return { message: null, jobs: [] }; }
// Roadmap
export async function generateRoadmap(params: any): Promise<any> { return { todos: [] }; }
export async function generateGoals(userId: string, cvId?: string): Promise<any> { return { goals: [{ id: "g1", title: "Goal", description: "", target_role: "", priority: "medium", user_id: userId }] }; }
