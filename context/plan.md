# Implementation Plan for CareerPilot — Member B (Frontend & UI)

## Ownership Summary

Member B is solely responsible for the entire frontend application built in Next.js 14. This includes all pages, components, state management, API integration, and the visual design of all four pillars: the Job Hunter UI, the AI Chat interface, the Productivity Tracker, and the Progress Dashboard. Member B works from the API contracts defined on Day 1 and stubs responses locally whenever Member A's backend is not yet ready.

---

## Checklist of Phases

- [ ] Phase 1: Frontend Scaffold & Design System
- [ ] Phase 2: Authentication & Onboarding (CV Upload) UI
- [ ] Phase 3: Job Hunter UI (Search + Job Cards + Fit Score Display)
- [ ] Phase 4: AI Chat Interface (Streaming + Suggested Prompts)
- [ ] Phase 5: Kanban Application Tracker
- [ ] Phase 6: Calendar & To-Do Module
- [ ] Phase 7: Progress Dashboard
- [ ] Phase 8: Profile / CV Preview Page
- [ ] Phase 9: Polish, Responsiveness & Loading States
- [ ] Phase 10: Demo Video & Final Handoff

---

## Phase 1 – Frontend Scaffold & Design System

### Goals

- Bootstrap the Next.js 14 application with TypeScript, Tailwind CSS, and shadcn/ui.
- Establish global layout, navigation, colour tokens, and the shared API client so every later phase starts from a consistent base.

### Tasks

1. In `frontend/`, run:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   ```
2. Install all required packages:
   ```bash
   npm install axios swr zustand lucide-react
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
   npm install react-hot-toast
   ```
3. Initialise shadcn/ui and add components:
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button card dialog input badge progress tabs sheet textarea select
   ```
4. Create `src/lib/api.ts` exporting typed wrappers for every backend endpoint defined in `api-contracts.md`:
   - `uploadCV(file: File): Promise<{ cv_id: string; sections_found: string[] }>`
   - `searchJobs(q: string, location: string): Promise<{ jobs: Job[] }>`
   - `sendChat(message: string, sessionId: string, cvId: string): Promise<{ reply: string; sources: string[] }>`
   - `createSession(): Promise<{ session_id: string }>`
   - `getApplications(): Promise<Application[]>`
   - `upsertApplication(data: Partial<Application>): Promise<Application>`
   - `getTodos(): Promise<Todo[]>`
   - `upsertTodo(data: Partial<Todo>): Promise<Todo>`
   - `getGoals(): Promise<Goal[]>`
   - `getDashboardStats(): Promise<DashboardStats>`
5. Create `src/types/index.ts` defining all shared TypeScript interfaces: `Job`, `Application`, `Todo`, `Goal`, `DashboardStats`, `ChatMessage`.
6. Create `src/store/useAppStore.ts` using Zustand with slices for: `cvId`, `sessionId`, `user`.
7. Create `src/app/layout.tsx` with: global nav sidebar (links to Dashboard, Jobs, Chat, Tracker, Calendar), `<Toaster />` from `react-hot-toast`, and a top bar showing the user's name if logged in.
8. Create a `src/components/ui/Spinner.tsx` and `src/components/ui/EmptyState.tsx` for reuse across all pages.
9. Create `frontend/.env.local` (gitignored) with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

### Acceptance Criteria

- `npm run dev` starts without errors on port 3000.
- Global sidebar renders on all pages with correct navigation links.
- `src/lib/api.ts` exports all typed functions; TypeScript compiles with zero errors.
- `src/types/index.ts` contains all shared types.

---

## Phase 2 – Authentication & Onboarding (CV Upload) UI

### Goals

- Build the first screen users see: a clean onboarding flow that collects the CV and stores the resulting `cv_id` globally so every downstream feature is grounded in it.

### Tasks

1. Create `src/app/page.tsx` as the landing / onboarding page. Show a two-step flow:
   - **Step 1**: A drag-and-drop CV upload zone accepting `.pdf` and `.docx` files only.
   - **Step 2**: After successful upload, show a profile preview card listing the sections detected.
2. Create `src/components/CVUpload.tsx`:
   - Accepts drag-and-drop or click-to-browse.
   - Shows file name and size after selection.
   - Shows an uploading spinner with the message "Analysing your CV…" while the API call is in flight.
   - On success, displays a green checkmark and the list of detected sections (e.g. `Experience ✓ Skills ✓ Projects ✓`).
   - On error, shows a red toast: "Upload failed — please try a PDF or DOCX file."
3. On successful upload, store `cv_id` in Zustand store and in `localStorage` so it persists on page refresh.
4. After upload, redirect the user to `/dashboard` automatically after 2 seconds.
5. If `cv_id` already exists in `localStorage` on load, skip the upload step and go directly to `/dashboard`.
6. Create a "Re-upload CV" button accessible from the sidebar that clears `cv_id` and returns to the upload screen.

### Acceptance Criteria

- Drag-and-drop accepts PDF and DOCX; rejects other file types with a toast error.
- Upload spinner is visible during the API call.
- Detected sections are displayed on success.
- `cv_id` persists in `localStorage` across page refreshes.
- Navigating to `/` with an existing `cv_id` redirects to `/dashboard` without re-uploading.

---

## Phase 3 – Job Hunter UI

### Goals

- Build the job search page where users type a natural language query, see live job cards with fit scores, and can add any job to their tracker in one click.

### Tasks

1. Create `src/app/jobs/page.tsx` as the Job Hunter page.
2. Create `src/components/JobSearch/SearchBar.tsx`: a text input with a location input and a "Search" button. On submit, call `searchJobs(q, location)` from `api.ts`.
3. Create `src/components/JobSearch/JobCard.tsx` displaying:
   - Role title (large, bold).
   - Company name.
   - Location.
   - Salary range (show "Not specified" if null).
   - Application deadline formatted as `DD MMM YYYY`.
   - A colour-coded **Fit Score badge**: green (≥75%), amber (50–74%), red (<50%).
   - A collapsible "Why this score?" section showing the `fit_reasons` list from the API.
   - A "Track this job" button that adds the job to the Kanban board via `upsertApplication`.
4. Create `src/components/JobSearch/JobCardGrid.tsx` that renders a responsive 2-column grid of `JobCard` components with a loading skeleton (3 placeholder cards) while the search is in progress.
5. Add an empty state: if no results, show a friendly illustration and the message "No jobs found — try a different query or location."
6. Show a "Searching for jobs…" skeleton state while the API call is in progress.
7. After clicking "Track this job", change the button to "Added ✓" (disabled) so it cannot be double-added.
8. Add filter chips above the grid for: All | High Fit (≥75%) | Applied. Implement client-side filtering only.

### Acceptance Criteria

- Searching "ML engineer Dhaka" renders job cards with all required fields.
- Fit Score badge colour matches the score value.
- "Why this score?" expands to show the fit reasons list.
- "Track this job" calls `upsertApplication` and button changes to "Added ✓".
- Loading skeleton renders during API call; empty state renders when results are empty.
- Filter chips correctly filter the displayed cards client-side.

---

## Phase 4 – AI Chat Interface

### Goals

- Build a full-screen chat interface where users can ask career questions and receive RAG-grounded responses. The interface must feel fast, support suggested prompts, and visually cite which CV sections were used.

### Tasks

1. Create `src/app/chat/page.tsx` as the AI Assistant page.
2. On mount, call `createSession()` and store the returned `session_id` in component state (also stored in Zustand).
3. Create `src/components/Chat/ChatWindow.tsx` that renders a scrollable list of `ChatMessage` bubbles. User messages align right; assistant messages align left. Auto-scroll to the bottom on new messages.
4. Create `src/components/Chat/ChatMessage.tsx` that renders:
   - The message text (support markdown — install `react-markdown`).
   - For assistant messages: a "Sources used" pill row below the message showing the CV sections cited (e.g. `Skills` `Experience`).
5. Create `src/components/Chat/ChatInput.tsx`: a multiline textarea with a send button. Submit on Enter (Shift+Enter for newline). Disable input while a response is loading.
6. Create `src/components/Chat/SuggestedPrompts.tsx` showing 4 clickable prompt chips that populate the input on click:
   - "Am I ready for a data engineer role?"
   - "What skills am I missing for a Google internship?"
   - "Build me a 3-month roadmap to become job-ready"
   - "Draft a cover letter for [paste job here]"
   Hide suggested prompts after the first message is sent.
7. Show a typing indicator (three animated dots) while the API response is loading.
8. Add a "Copy" icon button on each assistant message that copies the text to clipboard.
9. Show a banner at the top: "Responses are grounded in your uploaded CV. Upload a new CV to update your profile."

### Acceptance Criteria

- Sending a message calls `POST /api/chat` with the correct `session_id` and `cv_id`.
- Typing indicator appears while awaiting response.
- Assistant messages render markdown correctly (bold, lists, headers).
- "Sources used" pills appear below every assistant message with non-empty sources.
- Suggested prompts auto-populate the input on click and are hidden after first send.
- Copy button copies the message text to clipboard.

---

## Phase 5 – Kanban Application Tracker

### Goals

- Build a drag-and-drop Kanban board with four columns (Applied, Interviewing, Offer, Rejected) that persists to Supabase via the backend and gives users a full application history.

### Tasks

1. Create `src/app/tracker/page.tsx` as the Application Tracker page.
2. Create `src/components/Tracker/KanbanBoard.tsx` using `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop between columns.
3. Create four column components, each labelled and colour-coded:
   - **Applied** — blue border.
   - **Interviewing** — amber border.
   - **Offer** — green border.
   - **Rejected** — red border.
4. Create `src/components/Tracker/ApplicationCard.tsx` showing:
   - Job title and company.
   - Date added (formatted `DD MMM YYYY`).
   - A coloured status badge matching the column.
   - A "Notes" field (editable inline on click).
   - A delete (trash) icon that removes the card after a confirmation dialog.
5. Implement `onDragEnd` handler that calls `upsertApplication({ id, status: newColumn })` when a card is moved between columns.
6. On page load, call `getApplications()` and populate the board; show a loading skeleton for each column while fetching.
7. Create `src/components/Tracker/AddApplicationModal.tsx`: a dialog (using shadcn `Dialog`) with fields for Job Title, Company, Location, Deadline (date picker), and initial Status. Submits via `upsertApplication`.
8. Add an "+ Add Application" button in the page header that opens the modal.
9. Show a column count badge (e.g. `Applied (3)`) on each column header.

### Acceptance Criteria

- Dragging a card from Applied to Interviewing persists the status change via API.
- Column count badges update immediately after drag.
- "+ Add Application" modal saves and the card appears in the correct column.
- Delete removes the card and calls the delete API endpoint.
- Loading skeletons are shown during initial data fetch.
- Board is usable on mobile (cards stack vertically; drag-and-drop works on touch).

---

## Phase 6 – Calendar & To-Do Module

### Goals

- Build a combined calendar and to-do list page that lets users track deadlines, link tasks to career goals, and view their week at a glance.

### Tasks

1. Create `src/app/calendar/page.tsx` as the Calendar & To-Do page with a two-panel layout: calendar on the left, to-do list on the right.
2. In the left panel, implement a monthly calendar using `@fullcalendar/react` and `@fullcalendar/daygrid`. Events are populated from:
   - Application deadlines fetched from `getApplications()`.
   - Todo `due_date` values from `getTodos()`.
   Click on a day to add a new to-do due that day.
3. Create `src/components/Calendar/TodoList.tsx` that renders the to-do items for the selected day (defaults to today). Each item shows:
   - A checkbox (clicking it calls `upsertTodo({ id, done: true })`).
   - The task title (strikethrough if done).
   - The linked goal name (if any), shown as a small tag.
   - A delete icon.
4. Create `src/components/Calendar/AddTodoModal.tsx` with fields: Title (required), Due date (date picker), Link to goal (dropdown populated from `getGoals()`).
5. In the right panel, above the to-do list, show a "Goals" section listing all active goals with a progress bar (`progress` field from `getGoals()`). Clicking a goal filters the to-do list to show only tasks linked to it.
6. Add an "+ Add To-Do" button that opens `AddTodoModal`.
7. Highlight days with events on the calendar with a coloured dot below the date number.

### Acceptance Criteria

- Calendar renders current month with event dots on days that have todos or deadlines.
- Clicking a day updates the to-do list to show tasks due that day.
- Checking a todo calls `upsertTodo` and shows a strikethrough immediately (optimistic UI).
- Goals section shows progress bars that reflect the `progress` field from the API.
- "+ Add To-Do" modal saves and the task appears in the correct day on the calendar immediately.

---

## Phase 7 – Progress Dashboard

### Goals

- Build the home dashboard that gives users a weekly snapshot of their career progress, including applications sent, skills added, roadmap completion percentage, and streak counter.

### Tasks

1. Create `src/app/dashboard/page.tsx` as the home dashboard (this is where users land after CV upload).
2. Create `src/components/Dashboard/StatsGrid.tsx` showing four stat cards fetched from `GET /api/dashboard/stats`:
   - **Applications this week** — number with a trend arrow vs last week.
   - **Skills in CV** — count of skill tokens detected in the CV.
   - **Roadmap progress** — percentage bar (0–100%).
   - **Current streak** — number of consecutive days with activity (application added or todo completed), with a flame icon.
3. Create `src/components/Dashboard/RecentApplications.tsx` showing the last 5 applications as a compact list with status badges.
4. Create `src/components/Dashboard/AICard.tsx` — a card prompting the user with a suggested action. Call `GET /api/nudge?cv_id=...` which returns `{ message: string, jobs: Job[] }`. Display the nudge message and up to 3 matching job cards below it. If no nudge is returned, show a motivational placeholder.
5. Create `src/components/Dashboard/UpcomingDeadlines.tsx` showing the next 5 upcoming application deadlines sorted by date, with a colour urgency indicator (red if due within 3 days, amber if within 7 days, green otherwise).
6. On page load, fetch all dashboard data in parallel using `Promise.all` — do not chain fetches sequentially.

### Acceptance Criteria

- All four stat cards render with real data from the API.
- `AICard` displays the nudge message when the backend returns one.
- `RecentApplications` shows the correct 5 most recent applications.
- `UpcomingDeadlines` correctly colours deadlines by urgency.
- All data is fetched in parallel (verifiable via the Network tab — requests fire simultaneously).

---

## Phase 8 – Profile / CV Preview Page

### Goals

- Let users view exactly what the system knows about them — the parsed sections of their CV — so they can verify the RAG layer is using correct information.

### Tasks

1. Create `src/app/profile/page.tsx` as the Profile page.
2. Call `GET /api/cv/{cv_id}/sections` on load and render each section in a labelled expandable card (shadcn `Accordion`).
3. Show four section cards: Experience, Education, Skills, Projects. If a section was not detected, show a greyed-out card with the message "Section not detected in your CV."
4. Add a "Re-upload CV" button at the top of the page that clears `cv_id` from store and `localStorage` and navigates to `/`.
5. Show the `cv_id` in small text at the bottom for debugging purposes.

### Acceptance Criteria

- Profile page renders all detected CV sections with their raw text content.
- Sections not found display the "not detected" placeholder.
- "Re-upload CV" button clears state and redirects to the upload page.

---

## Phase 9 – Polish, Responsiveness & Loading States

### Goals

- Make the application feel production-quality: consistent loading skeletons, proper error boundaries, mobile-friendly layouts, and no broken states.

### Tasks

1. Add a `src/components/ui/Skeleton.tsx` component and use it on every page that fetches data — replace raw `null` renders with skeleton placeholders during loading.
2. Wrap each page's data-fetching section in a React `ErrorBoundary` that shows a friendly "Something went wrong — try refreshing" message instead of a white screen.
3. Make the sidebar collapse to a hamburger menu on screens narrower than 768px using Tailwind responsive classes.
4. Verify the Kanban board is usable on mobile: columns scroll horizontally; touch drag-and-drop works.
5. Add `aria-label` attributes to all icon-only buttons (trash icons, copy icons, close buttons).
6. Run `npm run build` and resolve all TypeScript and ESLint errors before declaring done.
7. Test the full user flow manually: upload CV → search jobs → open chat → ask all 4 benchmark queries → add a job to tracker → check dashboard stats — confirm no errors in the browser console.

### Acceptance Criteria

- Every page shows a skeleton during loading, not a blank white area.
- No TypeScript errors on `npm run build`.
- No ESLint errors on `npm run lint`.
- Sidebar collapses correctly on mobile.
- Full user flow passes without any browser console errors.

---

## Phase 10 – Demo Video & Final Handoff

### Goals

- Record the required 5-minute demo video and ensure the frontend is deployed and publicly accessible.

### Tasks

1. Deploy frontend to Vercel: connect the GitHub repo, set `NEXT_PUBLIC_API_URL` to the Railway backend URL provided by Member A, confirm the build succeeds.
2. Share the Vercel public URL with the team and update the root `README.md` with the live URL.
3. Record the 5-minute demo video covering the required flow in order:
   - **0:00–0:30** — CV upload and section detection.
   - **0:30–1:30** — Job search with fit scores and "Why this score?" expansion.
   - **1:30–2:30** — AI chat: readiness query, gap analysis query, cover letter draft.
   - **2:30–3:30** — Kanban tracker: add application, drag between columns.
   - **3:30–4:30** — Calendar: add a deadline, check a to-do.
   - **4:30–5:00** — Progress dashboard overview.
4. Upload the video and add the link to the root `README.md` under a "Demo" section.

### Acceptance Criteria

- Vercel deployment is live and all four pillars are functional on the public URL.
- Demo video is exactly 5 minutes or shorter and covers all 6 required sections.
- Video link is committed to `README.md`.

---

*This plan is intentionally granular to enable a coding agent to work through each phase sequentially. Complete each phase fully and verify all acceptance criteria before proceeding to the next.*
