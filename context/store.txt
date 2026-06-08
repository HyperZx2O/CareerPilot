import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Job, Application, Todo, Goal, DashboardStats } from "@/types";

interface UserSettings {
  notifications: "all" | "important" | "none";
  weekly_report: boolean;
  theme: "light" | "dark" | "auto";
  groq_api_key: string;
  nvidia_api_key: string;
}

interface AppState {
  // User
  userId: string | null;
  authToken: string | null;
  cvId: string | null;
  setUser: (userId: string) => void;
  setAuthToken: (token: string | null) => void;
  setCvId: (cvId: string) => void;

  // Settings
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;

  // Jobs
  jobs: Job[];
  jobsLoading: boolean;
  setJobs: (jobs: Job[]) => void;
  setJobsLoading: (v: boolean) => void;

  // Applications (Kanban)
  applications: Application[];
  setApplications: (apps: Application[]) => void;
  moveApplication: (id: string, status: Application["status"]) => void;

  // Todos
  todos: Todo[];
  setTodos: (todos: Todo[]) => void;
  toggleTodo: (id: string) => void;

  // Goals
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;

  // Dashboard
  stats: DashboardStats | null;
  setStats: (s: DashboardStats) => void;

  // Chat
  chatMessages: { role: "user" | "assistant"; content: string; sources?: string[] }[];
  addChatMessage: (msg: { role: "user" | "assistant"; content: string; sources?: string[] }) => void;
  clearChat: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        userId: null,
        authToken: null,
        cvId: null,
        setUser: (userId) => set({ userId }),
        setAuthToken: (authToken) => set({ authToken }),
        setCvId: (cvId) => set({ cvId }),

        settings: {
          notifications: "important",
          weekly_report: true,
          theme: "dark",
          groq_api_key: "",
          nvidia_api_key: "",
        },
        setSettings: (settings) => set({ settings }),
        updateSetting: (key, value) =>
          set((s) => ({ settings: { ...s.settings, [key]: value } })),

        jobs: [],
        jobsLoading: false,
        setJobs: (jobs) => set({ jobs }),
        setJobsLoading: (jobsLoading) => set({ jobsLoading }),

        applications: [],
        setApplications: (applications) => set({ applications }),
        moveApplication: (id, status) =>
          set((s) => ({
            applications: s.applications.map((a) =>
              a.id === id ? { ...a, status } : a
            ),
          })),

        todos: [],
        setTodos: (todos) => set({ todos }),
        toggleTodo: (id) =>
          set((s) => ({
            todos: s.todos.map((t) =>
              t.id === id ? { ...t, done: !t.done } : t
            ),
          })),

        goals: [],
        setGoals: (goals) => set({ goals }),

        stats: null,
        setStats: (stats) => set({ stats }),

        chatMessages: [],
        addChatMessage: (msg) =>
          set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
        clearChat: () => set({ chatMessages: [] }),
      }),
      {
        name: "careerpilot-storage",
        partialize: (state) => {
          const { groq_api_key, nvidia_api_key, ...restSettings } = state.settings;
          return {
            cvId: state.cvId,
            userId: state.userId,
            applications: state.applications,
            todos: state.todos,
            goals: state.goals,
            stats: state.stats,
            settings: restSettings,
          };
        },
      }
    )
  )
);
