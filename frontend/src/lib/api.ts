import axios from "axios";
import type {
  Application,
  ChatMessage,
  CV,
  DashboardStats,
  Goal,
  Job,
  NudgeResponse,
  Todo,
  UploadCVResponse,
} from "@/types";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

// Attach Authorization header for every request (Clerk JWT stored in localStorage by Clerk SDK)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("__clerk_db_jwt");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ─── CV Endpoints ─────────────────────────────────────────────────────────────

/**
 * Upload a CV file (PDF or DOCX) and receive the resulting cv_id and detected sections.
 */
export async function uploadCV(
  file: File
): Promise<UploadCVResponse> {
  if (USE_MOCKS) {
    // Simulate a brief delay for processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      cv_id: `mock-cv-${Math.random().toString(36).substring(2, 9)}`,
      sections_found: ["experience", "education", "skills", "projects"],
    };
  }

  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<UploadCVResponse>("/api/v1/cv/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Poll for the processing status of an uploaded CV.
 */
export async function getCVStatus(cvId: string): Promise<CV> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      id: cvId,
      user_id: "mock-user-123",
      file_name: "mock_resume.pdf",
      file_type: "pdf",
      sections_found: ["experience", "education", "skills", "projects"],
      processing_status: "complete",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const { data } = await api.get<CV>(`/api/v1/cv/${cvId}`);
  return data;
}

/**
 * Fetch all parsed sections for a given cv_id.
 */
export async function getCVSections(
  cvId: string
): Promise<Record<string, string>> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      experience: `### Work Experience

**Senior Web Developer | TechCorp (2022 - Present)**
- Led development of a user-facing SaaS platform using React, Next.js, and TypeScript.
- Implemented robust state management using Zustand and optimized API query times by 35%.
- Mentored junior engineers and conducted code reviews to ensure high-quality standards.

**Software Engineer | StartupCo (2020 - 2022)**
- Built responsive user interfaces and integrated RESTful APIs.
- Collaborated closely with designers using Figma to deliver pixel-perfect components.`,
      education: `### Education

**B.Sc. in Computer Science & Engineering**
University of Tech (Graduated 2020)`,
      skills: `### Technical Skills

- **Frontend**: React, Next.js, TypeScript, Tailwind CSS, JavaScript (ES6+).
- **Backend/Databases**: Node.js, Express, PostgreSQL, MongoDB, REST APIs.
- **Tools**: Git, Docker, Figma, VS Code.`,
      projects: `### Key Projects

**CareerPilot (PaaS)**
- Created a career optimization tool featuring a job search engine and customized progress tracking dashboards.

**E-Commerce Dashboard**
- Developed a high-performance analytics dashboard supporting real-time data visualization.`,
    };
  }

  const { data } = await api.get<Record<string, string>>(
    `/api/v1/cv/${cvId}/sections`
  );
  return data;
}

// ─── Job Search Endpoints ─────────────────────────────────────────────────────

/**
 * Search for jobs matching a natural-language query and location.
 * Optionally provide cv_id to receive programmatic fit scores.
 */
export async function searchJobs(
  q: string,
  location: string,
  cvId?: string | null
): Promise<{ jobs: Job[] }> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const normalizedQuery = q.toLowerCase();
    
    let title1 = "Senior React Developer";
    let title2 = "Frontend UI Engineer";
    let title3 = "Full Stack Developer";
    let title4 = "Machine Learning Engineer";
    
    if (normalizedQuery.includes("ml") || normalizedQuery.includes("machine") || normalizedQuery.includes("ai")) {
      title1 = "Lead AI Researcher";
      title2 = "Machine Learning Engineer";
      title3 = "Data Scientist";
      title4 = "Python Software Developer";
    } else if (normalizedQuery.includes("backend") || normalizedQuery.includes("node") || normalizedQuery.includes("python") || normalizedQuery.includes("go")) {
      title1 = "Senior Back-End Engineer (Go)";
      title2 = "Node.js Platform Engineer";
      title3 = "Full Stack Engineer (Node/React)";
      title4 = "Junior Systems Programmer";
    } else if (normalizedQuery.includes("design") || normalizedQuery.includes("figma") || normalizedQuery.includes("ui") || normalizedQuery.includes("css")) {
      title1 = "Lead UX Engineer";
      title2 = "Design Engineer";
      title3 = "UI/UX Developer";
      title4 = "Product Designer";
    } else if (q.trim()) {
      const capitalized = q.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      title1 = `Senior ${capitalized}`;
      title2 = `${capitalized} Specialist`;
      title3 = `Full Stack ${capitalized}`;
      title4 = `Junior ${capitalized}`;
    }

    const loc = location || "Remote";

    return {
      jobs: [
        {
          id: "mock-job-1",
          title: title1,
          company: "Tech Giant Inc.",
          location: loc,
          salary_min: 130000,
          salary_max: 180000,
          currency: "USD",
          deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `We are looking for a specialist in ${q || "software engineering"} to lead our key product initiatives. You will work with a modern tech stack and drive execution.`,
          url: "https://example.com/jobs/1",
          source: "jsearch",
          fit_score: 92,
          fit_reasons: [
            "Your profile matches 95% of key technical requirements.",
            "Strong background in project leadership matches our role scope.",
            "Demonstrated experience in similar positions listed in your CV.",
          ],
          gap_reasons: [
            "No explicit experience with cloud infrastructure orchestration mentioned.",
          ],
          fetched_at: new Date().toISOString(),
        },
        {
          id: "mock-job-2",
          title: title2,
          company: "Fast Startup",
          location: loc,
          salary_min: 90000,
          salary_max: 120000,
          currency: "USD",
          deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `Seeking a dynamic professional to join our growing team. Focus will be on rapid prototyping and launching new features using state of the art tools.`,
          url: "https://example.com/jobs/2",
          source: "jsearch",
          fit_score: 76,
          fit_reasons: [
            "Matches requirements for standard toolsets and scripting languages.",
            "CV indicates highly adaptable experience suitable for high-growth startups.",
          ],
          gap_reasons: [
            "Role prefers 3+ years of experience, but your CV lists 1-2 years in this specialty.",
          ],
          fetched_at: new Date().toISOString(),
        },
        {
          id: "mock-job-3",
          title: title3,
          company: "Midsize Enterprise",
          location: loc,
          salary_min: null,
          salary_max: null,
          currency: null,
          deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `Collaborate across design and development teams to maintain and optimize core systems. Emphasis is on robust software architecture and testing frameworks.`,
          url: "https://example.com/jobs/3",
          source: "jsearch",
          fit_score: 58,
          fit_reasons: [
            "Core development skills and engineering processes line up nicely.",
          ],
          gap_reasons: [
            "CV is missing required focus on automated testing suites (Cypress/Jest).",
            "No prior experience in cross-functional product management roles.",
          ],
          fetched_at: new Date().toISOString(),
        },
        {
          id: "mock-job-4",
          title: title4,
          company: "Legacy Corp",
          location: loc,
          salary_min: 70000,
          salary_max: 95000,
          currency: "USD",
          deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: `Responsible for maintenance and legacy migration project work. Ideal candidate is organized and comfortable working with traditional software stacks.`,
          url: "https://example.com/jobs/4",
          source: "jsearch",
          fit_score: 41,
          fit_reasons: [
            "Basic coding capabilities and version control (Git) experience match.",
          ],
          gap_reasons: [
            "Requires extensive legacy database knowledge (Oracle, COBOL) not found in CV.",
            "Company requires on-site hybrid schedule; your profile indicates remote preference.",
          ],
          fetched_at: new Date().toISOString(),
        },
      ],
    };
  }

  const { data } = await api.get<{ jobs: Job[] }>("/api/v1/jobs/search", {
    params: { q, location, cv_id: cvId ?? undefined },
  });
  return data;
}

// ─── Chat Endpoints ───────────────────────────────────────────────────────────

/**
 * Create a new chat session. Returns a session_id to be stored globally.
 */
export async function createSession(): Promise<{ session_id: string }> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const sessionId = `mock-session-${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== "undefined") {
      const sessions = JSON.parse(localStorage.getItem("mock-chat-sessions") || "[]");
      sessions.push(sessionId);
      localStorage.setItem("mock-chat-sessions", JSON.stringify(sessions));
    }
    return { session_id: sessionId };
  }

  const { data } = await api.post<{ session_id: string }>("/api/v1/chat/session");
  return data;
}

/**
 * Send a chat message and receive the assistant's reply with cited sources.
 */
export async function sendChat(
  message: string,
  sessionId: string,
  cvId: string
): Promise<{ reply: string; sources: string[] }> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const normalized = message.toLowerCase();
    let reply = "";
    let sources: string[] = [];
    let queryType: "readiness" | "gap" | "roadmap" | "cover_letter" | "general" = "general";
    
    if (normalized.includes("ready") || normalized.includes("readiness") || normalized.includes("fit") || normalized.includes("role")) {
      queryType = "readiness";
      sources = ["experience", "skills"];
      reply = `Based on your uploaded CV, here is a **Readiness Analysis** for a **Data Engineer** or developer role:

### Key Match Areas:
- **Programming**: Python and SQL are well-represented in your projects and skills list.
- **Databases**: You have experience with PostgreSQL and MongoDB.

### Missing/Weak Areas:
- **Data Pipelines**: No mention of ETL tools like Apache Airflow, Spark, or Kafka.
- **Cloud Services**: Experience with AWS/GCP data tools (BigQuery, Redshift) is minimal.

### Overall Readiness: **Borderline (60%)**
You have a solid software foundation but need to build portfolio projects demonstrating ETL and cloud data warehousing skills.`;
    } else if (normalized.includes("missing") || normalized.includes("gap") || normalized.includes("skills")) {
      queryType = "gap";
      sources = ["skills", "education"];
      reply = `Here is a gap analysis comparing your CV against expectations for a **Google Software Engineering Internship** or modern development roles:

### Core Skill Gaps Identified:
1. **Data Structures & Algorithms**: Although you study Computer Science, your CV lacks competitive programming or advanced DSA project highlights.
2. **System Design**: Google interviews evaluate basic system design concepts, which aren't highlighted in your profile.
3. **Open Source/Large Codebase Experience**: Consider contributing to open-source projects to show you can navigate large code repos.

### Recommended Action Plan:
- Practise at least 150 LeetCode questions (focus on Graphs, Trees, and DP).
- Add a project to your CV that handles high-throughput API requests.`;
    } else if (normalized.includes("roadmap") || normalized.includes("plan") || normalized.includes("month")) {
      queryType = "roadmap";
      sources = ["experience", "education"];
      reply = `Here is a customized **3-Month Roadmap** to bridge your skills gap and prepare you for job applications:

### Month 1: Advanced Tools & Infrastructure
- Focus on Docker/Kubernetes containerization.
- Learn CI/CD pipeline automation (GitHub Actions).

### Month 2: Core Capstone Project
- Build a full-stack project utilizing a microservices architecture.
- Implement comprehensive unit and integration testing (Jest, Cypress).

### Month 3: Interview Prep & Resume Polish
- Refine your CV layout using quantifiable metrics (e.g., "optimized query speeds by 40%").
- Conduct mock interview practice focusing on behavioural and technical questions.`;
    } else if (normalized.includes("cover letter") || normalized.includes("draft")) {
      queryType = "cover_letter";
      sources = ["experience", "projects"];
      reply = `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position. Based on the experiences detailed in my resume, I believe I would be an excellent fit for your team.

In my past projects, I successfully built scalable web applications using React, Node.js, and TypeScript. I have demonstrated a strong ability to collaborate in fast-paced environments and deliver clean, well-tested code.

I am particularly excited about your company's focus on user-centric product engineering, and I would love the opportunity to contribute my skills to your mission.

Sincerely,  
[Your Name]`;
    } else {
      queryType = "general";
      sources = ["experience"];
      reply = `Hello! I'm your AI career pilot. I can help you with:
- Analyzing your job readiness based on your CV
- Finding missing skill gaps for your target roles
- Structuring a customized study or project roadmap
- Drafting tailored cover letters

How can I help you navigate your career journey today?`;
    }
    
    if (typeof window !== "undefined") {
      const storageKey = `mock-chat-messages-${sessionId}`;
      const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
      
      const userMsg: ChatMessage = {
        id: `mock-msg-${Math.random().toString(36).substring(2, 9)}`,
        session_id: sessionId,
        role: "user",
        content: message,
        sources: [],
        query_type: null,
        created_at: new Date().toISOString()
      };
      
      const assistantMsg: ChatMessage = {
        id: `mock-msg-${Math.random().toString(36).substring(2, 9)}`,
        session_id: sessionId,
        role: "assistant",
        content: reply,
        sources,
        query_type: queryType,
        created_at: new Date().toISOString()
      };
      
      history.push(userMsg, assistantMsg);
      localStorage.setItem(storageKey, JSON.stringify(history));
    }
    
    return { reply, sources };
  }

  const { data } = await api.post<{ reply: string; sources: string[] }>(
    "/api/v1/chat",
    { message, session_id: sessionId, cv_id: cvId }
  );
  return data;
}

/**
 * Fetch all messages for an existing chat session.
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (typeof window !== "undefined") {
      const storageKey = `mock-chat-messages-${sessionId}`;
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    }
    return [];
  }

  const { data } = await api.get<ChatMessage[]>(
    `/api/v1/chat/session/${sessionId}/messages`
  );
  return data;
}

// ─── Application Tracker Endpoints ───────────────────────────────────────────

/**
 * Fetch all Kanban applications for the current user.
 */
export async function getApplications(): Promise<Application[]> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (typeof window !== "undefined") {
      const apps = localStorage.getItem("mock-applications");
      if (!apps) {
        const defaultApps: Application[] = [
          {
            id: "mock-app-1",
            user_id: "mock-user-123",
            job_title: "Senior React Developer",
            company: "Google",
            location: "Mountain View, CA",
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "interviewing",
            notes: "Need to prepare for the coding test next Tuesday. Practice graphs and trees.",
            job_id: null,
            fit_score: 92,
            applied_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "mock-app-2",
            user_id: "mock-user-123",
            job_title: "Frontend UI Engineer",
            company: "Stripe",
            location: "Remote",
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "applied",
            notes: "Really like their design system and developer documentation. Follow up in a week.",
            job_id: null,
            fit_score: 85,
            applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: "mock-app-3",
            user_id: "mock-user-123",
            job_title: "ML Intern",
            company: "Meta",
            location: "Menlo Park, CA",
            deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: "offer",
            notes: "Received verbal offer! Waiting for the formal contract document.",
            job_id: null,
            fit_score: 78,
            applied_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
        localStorage.setItem("mock-applications", JSON.stringify(defaultApps));
        return defaultApps;
      }
      return JSON.parse(apps);
    }
    return [];
  }

  const { data } = await api.get<Application[]>("/api/v1/tracker/applications");
  return data;
}

/**
 * Create or update an application. Provide an id to update; omit to create.
 */
export async function upsertApplication(
  appData: Partial<Application>
): Promise<Application> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (typeof window !== "undefined") {
      const apps = JSON.parse(localStorage.getItem("mock-applications") || "[]") as Application[];
      
      if (appData.id) {
        // Update
        const idx = apps.findIndex((a) => a.id === appData.id);
        if (idx !== -1) {
          const updated: Application = {
            ...apps[idx],
            ...appData,
            updated_at: new Date().toISOString(),
          } as Application;
          apps[idx] = updated;
          localStorage.setItem("mock-applications", JSON.stringify(apps));
          return updated;
        }
      }
      
      // Create
      const newApp: Application = {
        id: appData.id ?? `mock-app-${Math.random().toString(36).substring(2, 9)}`,
        user_id: "mock-user-123",
        job_title: appData.job_title ?? "Software Engineer",
        company: appData.company ?? "Google",
        location: appData.location ?? "Remote",
        deadline: appData.deadline ?? null,
        status: appData.status ?? "applied",
        notes: appData.notes ?? null,
        job_id: appData.job_id ?? null,
        fit_score: appData.fit_score ?? null,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      apps.push(newApp);
      localStorage.setItem("mock-applications", JSON.stringify(apps));
      return newApp;
    }
    throw new Error("Local storage unavailable");
  }

  if (appData.id) {
    const { data } = await api.patch<Application>(
      `/api/v1/tracker/applications/${appData.id}`,
      appData
    );
    return data;
  }
  const { data } = await api.post<Application>(
    "/api/v1/tracker/applications",
    appData
  );
  return data;
}

/**
 * Delete an application by id.
 */
export async function deleteApplication(id: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (typeof window !== "undefined") {
      const apps = JSON.parse(localStorage.getItem("mock-applications") || "[]") as Application[];
      const filtered = apps.filter((a) => a.id !== id);
      localStorage.setItem("mock-applications", JSON.stringify(filtered));
    }
    return;
  }

  await api.delete(`/api/v1/tracker/applications/${id}`);
}

// ─── To-Do Endpoints ─────────────────────────────────────────────────────────

/**
 * Fetch all to-do items for the current user.
 */
export async function getTodos(): Promise<Todo[]> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mock-todos");
      if (!stored) {
        const defaultTodos: Todo[] = [
          {
            id: "mock-todo-1",
            user_id: "mock-user-123",
            goal_id: "mock-goal-1",
            title: "Review React 19 documentation and hooks",
            due_date: new Date().toISOString().split("T")[0],
            done: false,
            created_at: new Date().toISOString(),
          },
          {
            id: "mock-todo-2",
            user_id: "mock-user-123",
            goal_id: "mock-goal-1",
            title: "Polish CareerPilot landing page design",
            due_date: new Date().toISOString().split("T")[0],
            done: true,
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "mock-todo-3",
            user_id: "mock-user-123",
            goal_id: "mock-goal-2",
            title: "Draft tailored cover letter for Stripe application",
            due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            done: false,
            created_at: new Date().toISOString(),
          },
        ];
        localStorage.setItem("mock-todos", JSON.stringify(defaultTodos));
        return defaultTodos;
      }
      return JSON.parse(stored) as Todo[];
    }
    return [];
  }

  const { data } = await api.get<Todo[]>("/api/v1/tracker/todos");
  return data;
}

/**
 * Create or update a to-do item.
 */
export async function upsertTodo(todoData: Partial<Todo>): Promise<Todo> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (typeof window !== "undefined") {
      const todos = JSON.parse(localStorage.getItem("mock-todos") || "[]") as Todo[];
      
      if (todoData.id) {
        const idx = todos.findIndex((t) => t.id === todoData.id);
        if (idx !== -1) {
          const updated: Todo = {
            ...todos[idx],
            ...todoData,
          } as Todo;
          todos[idx] = updated;
          localStorage.setItem("mock-todos", JSON.stringify(todos));
          return updated;
        }
      }

      const newTodo: Todo = {
        id: todoData.id ?? `mock-todo-${Math.random().toString(36).substring(2, 9)}`,
        user_id: "mock-user-123",
        goal_id: todoData.goal_id ?? null,
        title: todoData.title ?? "New Task",
        due_date: todoData.due_date ?? new Date().toISOString().split("T")[0],
        done: todoData.done ?? false,
        created_at: new Date().toISOString(),
      };
      todos.push(newTodo);
      localStorage.setItem("mock-todos", JSON.stringify(todos));
      return newTodo;
    }
    throw new Error("Local storage unavailable");
  }

  if (todoData.id) {
    const { data } = await api.patch<Todo>(
      `/api/v1/tracker/todos/${todoData.id}`,
      todoData
    );
    return data;
  }
  const { data } = await api.post<Todo>("/api/v1/tracker/todos", todoData);
  return data;
}

/**
 * Delete a to-do item by id.
 */
export async function deleteTodo(id: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof window !== "undefined") {
      const todos = JSON.parse(localStorage.getItem("mock-todos") || "[]") as Todo[];
      const filtered = todos.filter((t) => t.id !== id);
      localStorage.setItem("mock-todos", JSON.stringify(filtered));
    }
    return;
  }

  await api.delete(`/api/v1/tracker/todos/${id}`);
}

// ─── Goals Endpoints ──────────────────────────────────────────────────────────

/**
 * Fetch all goals for the current user.
 */
export async function getGoals(): Promise<Goal[]> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mock-goals");
      if (!stored) {
        const defaultGoals: Goal[] = [
          {
            id: "mock-goal-1",
            user_id: "mock-user-123",
            title: "Improve Frontend UI/UX Skills",
            target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            progress: 65,
            created_at: new Date().toISOString(),
          },
          {
            id: "mock-goal-2",
            user_id: "mock-user-123",
            title: "Land a Senior React Developer Job",
            target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            progress: 30,
            created_at: new Date().toISOString(),
          },
        ];
        localStorage.setItem("mock-goals", JSON.stringify(defaultGoals));
        return defaultGoals;
      }
      return JSON.parse(stored) as Goal[];
    }
    return [];
  }

  const { data } = await api.get<Goal[]>("/api/v1/tracker/goals");
  return data;
}

// ─── Dashboard Endpoints ──────────────────────────────────────────────────────

/**
 * Fetch aggregated dashboard statistics for the current user.
 */
export async function getDashboardStats(cvId?: string | null): Promise<DashboardStats> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (typeof window !== "undefined") {
      const apps = JSON.parse(localStorage.getItem("mock-applications") || "[]") as Application[];
      const goals = JSON.parse(localStorage.getItem("mock-goals") || "[]") as Goal[];

      // Calculate goals average progress
      const avgProgress = goals.length > 0
        ? Math.round(goals.reduce((acc, curr) => acc + curr.progress, 0) / goals.length)
        : 0;

      // Count apps this week
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const appsThisWeek = apps.filter((app) => {
        const applyDate = app.applied_at ? new Date(app.applied_at) : new Date();
        return applyDate >= sevenDaysAgo;
      }).length;

      return {
        applications_this_week: appsThisWeek,
        applications_last_week: 2,
        skills_count: 14,
        roadmap_progress: avgProgress,
        streak_days: 5,
        total_applications: apps.length,
      };
    }
    return {
      applications_this_week: 0,
      applications_last_week: 0,
      skills_count: 0,
      roadmap_progress: 0,
      streak_days: 0,
      total_applications: 0,
    };
  }

  const { data } = await api.get<DashboardStats>("/api/v1/dashboard/stats", {
    params: { cv_id: cvId ?? undefined },
  });
  return data;
}

/**
 * Fetch a proactive AI nudge with matching job suggestions.
 */
export async function getNudge(cvId: string): Promise<NudgeResponse> {
  if (USE_MOCKS) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      message: "We've analyzed your Senior React Developer goals. To strengthen your CV, consider expanding your knowledge in Next.js Turbopack and React 19 concurrent features. We found two highly matching job postings!",
      jobs: [
        {
          id: "nudge-job-1",
          title: "Senior Frontend Engineer (Next.js)",
          company: "Vercel",
          location: "Remote (US)",
          salary_min: 150000,
          salary_max: 200000,
          currency: "USD",
          deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: "We are looking for a Senior Frontend Engineer to work on Next.js core developer workflows...",
          url: "https://vercel.com/careers",
          source: "jsearch",
          fit_score: 95,
          fit_reasons: [
            "Your strong React project experience perfectly aligns with the core requirements",
            "Extensive experience in Next.js is a direct match",
          ],
          gap_reasons: [
            "Lacks direct Rust/Turbopack codebase contribution background",
          ],
          fetched_at: new Date().toISOString(),
        },
        {
          id: "nudge-job-2",
          title: "UI Lead Engineer",
          company: "Linear",
          location: "Remote (Global)",
          salary_min: 140000,
          salary_max: 180000,
          currency: "USD",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: "Help build the fastest tracking tool on the web. Focus on high performance rendering...",
          url: "https://linear.app/careers",
          source: "adzuna",
          fit_score: 88,
          fit_reasons: [
            "Stunning frontend portfolio aligns with high craft and UX bar",
            "Proficient in Zustand client-side state management",
          ],
          gap_reasons: [
            "Familiarity with WebGL or Canvas rendering was not explicitly detected",
          ],
          fetched_at: new Date().toISOString(),
        },
      ],
    };
  }

  const { data } = await api.get<NudgeResponse>("/api/v1/nudge", {
    params: { cv_id: cvId },
  });
  return data;
}

export default api;
