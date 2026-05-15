# DefenseReady — Phased Agent Prompt Plan

**App:** DefenseReady — A thesis defense preparation web app for students.  
**Stack:** PostgreSQL · Express.js · React (Vite) · Node.js · Supabase · Gemini API (Gemini)  
**How to use:** Paste one phase at a time into your Cursor AI agent (Composer, Agent mode). Complete and verify each phase before moving to the next.

---

## Phase 0: Project Setup & Architecture

### Summary
Before writing any feature code, establish the full project foundation. This phase covers scaffolding the monorepo structure, installing dependencies, configuring environment variables, setting up the Supabase project, and ensuring the frontend and backend can talk to each other. Everything built in later phases depends on getting this right.

### User Stories
- As a developer, I want a clean project structure so that frontend and backend code are clearly separated and easy to navigate.
- As a developer, I want environment variables configured so that secrets like API keys are never hardcoded.
- As a developer, I want the frontend and backend running locally at the same time so I can develop both simultaneously.
- As a developer, I want a Supabase project connected so the app has a database and file storage from day one.

### Tasks
- Scaffold a monorepo with two folders: `client/` (React + Vite) and `server/` (Express.js + Node.js).
- Install and configure Tailwind CSS and shadcn/ui on the client.
- Set up Express with CORS configured to allow requests from the frontend dev server.
- Create `.env.example` files for both client and server documenting every required variable.
- Create a Supabase project and add the URL, anon key, and service role key to the server `.env`.
- Add the Gemini API key to the server `.env`. This key must never be exposed to the client.
- Create a `/health` endpoint on the Express server that returns `{ status: "ok" }`.
- Create a simple test page on the React client that calls the `/health` endpoint and displays the result — confirming the two services can communicate.
- Write a `README.md` with clear instructions for how to install dependencies and run both services locally.

### Expected Output
- Running `npm run dev` in `/server` starts the Express API on port 3001.
- Running `npm run dev` in `/client` starts the React app on port 5173.
- Visiting the test page in the browser shows a success response from the backend.
- The project folder structure is clean, logical, and ready to build features on top of.

---

## Phase 1: Authentication

### Summary
Implement full user authentication using Supabase Auth. Students need accounts to save their manuscripts and session history. This phase covers sign up, log in, log out, and protecting routes so unauthenticated users cannot access the app. All subsequent phases depend on knowing who the current user is.

### User Stories
- As a student, I want to create an account with my email and password so I can access the app.
- As a student, I want to log in to my existing account so I can return to my saved manuscripts.
- As a student, I want to log out so my account is secure on shared devices.
- As a student, I want to be redirected to the login page if I try to access a protected page without being logged in.
- As a developer, I want every API request to the backend to carry the user's identity so I can enforce data ownership.

### Tasks
- Set up Supabase Auth on the client using the Supabase JS client.
- Build a Login page with email and password fields and a link to Sign Up.
- Build a Sign Up page with email, password, and full name fields.
- Show clear validation errors (wrong password, email already taken, etc.).
- Create a `useAuth` hook that exposes the current user, loading state, and a sign-out function.
- Create a `ProtectedRoute` component that redirects unauthenticated users to the login page.
- On the Express server, create an `authMiddleware` function that reads the `Authorization: Bearer <token>` header, verifies it with Supabase, and attaches the user object to the request. Return 401 if the token is missing or invalid.
- Apply `authMiddleware` to all non-public API routes (all routes built in later phases).
- Create a `profiles` table in Supabase that stores `id`, `full_name`, `email`, and `created_at`. Auto-populate it when a new user signs up using a Supabase database trigger.
- Enable Row Level Security on the `profiles` table so users can only read and update their own profile.

### Expected Output
- A student can create an account and is redirected to the dashboard after signing up.
- A student can log in and log out successfully.
- Visiting `/dashboard` or any protected route while logged out redirects to the login page.
- Visiting `/dashboard` while logged in shows the (empty) dashboard.
- API requests without a valid token return a 401 response.

---

## Phase 2: Manuscript Upload & Management

### Summary
Students upload their thesis PDF, which gets stored in Supabase Storage and parsed server-side to extract the raw text. The extracted text is what all four AI features read — so getting it right here makes everything else work. This phase also builds the manuscript library where students can see, manage, and delete their uploaded files.

### User Stories
- As a student, I want to upload my thesis PDF so the app can analyze it.
- As a student, I want to see all my uploaded manuscripts so I can pick which one to work with.
- As a student, I want to know the upload is in progress so I'm not left wondering if something went wrong.
- As a student, I want to delete a manuscript I no longer need so my library stays organized.
- As a student, I want each manuscript to show its title, file size, and upload date so I can identify them at a glance.

### Tasks
- Create a `manuscripts` table in Supabase with fields: `id`, `user_id`, `title`, `filename`, `storage_path`, `extracted_text`, `file_size_bytes`, `created_at`. Enable RLS so users only access their own rows.
- Create a private Supabase Storage bucket named `manuscripts`.
- Build a `POST /api/manuscripts/upload` endpoint that accepts a PDF file, uploads it to Supabase Storage under a path unique to the user, extracts the text using `pdf-parse`, and saves the record to the database.
- Build a `GET /api/manuscripts` endpoint that returns all manuscripts for the authenticated user.
- Build a `DELETE /api/manuscripts/:id` endpoint that removes the record from the database and the file from Supabase Storage.
- On the client, build a drag-and-drop upload zone that also supports clicking to open the file picker. Restrict to PDF files under 20MB.
- Show a real upload progress bar while the file uploads.
- Show clear error messages if the file is the wrong type, too large, or if the upload fails.
- Below the upload zone, show a grid of manuscript cards. Each card shows the title, upload date, file size, and four action buttons (placeholders for now): Mock Defense, Analysis, Chat, Panelist Recs.
- Show a skeleton loader while the manuscript list is loading.
- Show an empty state with helpful instructions when the student has no manuscripts yet.

### Expected Output
- A student can upload a PDF and see it appear in their manuscript library immediately after upload.
- The manuscript record in the database contains the full extracted text from the PDF.
- A student can delete a manuscript and it disappears from the list and from Supabase Storage.
- Uploading a non-PDF or a file over 20MB shows a clear error message.
- The upload progress bar moves as the file uploads.

---

## Phase 3: Strengths & Weaknesses Analysis

### Summary
The analysis feature reads the uploaded manuscript and generates a structured report identifying what the thesis does well, where it has gaps or weaknesses, and what the student should fix before their defense. Build this feature first among the four AI modules because it is a single API call with no conversational state — the simplest path to validating the Gemini integration end-to-end.

### User Stories
- As a student, I want to generate an analysis report of my thesis so I know what weaknesses my panel might target.
- As a student, I want to see my strengths so I know what parts of my thesis to confidently defend.
- As a student, I want weaknesses ranked by severity so I know which problems to fix first.
- As a student, I want concrete recommendations so I have clear next steps before my defense.
- As a student, I want the report to load automatically if I've already generated one so I don't have to re-run the analysis every time.

### Tasks
- Create an `analysis_reports` table in Supabase with fields: `id`, `manuscript_id`, `user_id`, `strengths` (jsonb), `weaknesses` (jsonb), `recommendations` (jsonb), `overall_summary`, `created_at`. Enable RLS.
- Build a `POST /api/analysis/analyze/:manuscriptId` endpoint. It fetches the manuscript's extracted text, sends it to Gemini with a prompt instructing the model to return a structured JSON object containing `overall_summary`, `strengths`, `weaknesses` (each with a `severity` of high/medium/low), and `recommendations` (each with a `priority`). Parse the response and save it to the database.
- Build a `GET /api/analysis/reports/:manuscriptId` endpoint that returns the most recent report for a manuscript.
- On the client, build an Analysis page at `/analysis/:manuscriptId`.
- When the page loads, check if a report already exists and display it if so.
- If no report exists, show an "Analyze Manuscript" button.
- Show a loading state with a progress message while analysis runs (it takes 10–20 seconds).
- Display the overall summary at the top of the report.
- Display strengths as green cards, weaknesses as red/amber cards with severity badges, and recommendations as blue cards with priority badges.
- Group weaknesses and strengths by category (Methodology, Literature Review, Results, etc.).
- Wire up the "Analysis" button on each manuscript card in the Dashboard to navigate to this page.

### Expected Output
- Clicking "Analyze Manuscript" sends the thesis to Gemini and returns a structured report within 20 seconds.
- The report shows at least 4 strengths, 6 weaknesses, and 5 recommendations.
- Weaknesses are visually distinguished by severity (high = red, medium = amber, low = blue).
- Revisiting the Analysis page shows the existing report instantly without re-running the analysis.
- The Dashboard's "Analysis" button navigates to this page.

---

## Phase 4: Chat with Manuscript

### Summary
Students can have a free-form conversation with an AI assistant that has read their full thesis. This lets them ask questions about their own work, test whether they can articulate their arguments clearly, and surface things they may have forgotten. Chat history is saved so students can pick up where they left off.

### User Stories
- As a student, I want to ask questions about my thesis so I can make sure I understand my own work deeply.
- As a student, I want the AI to only answer based on my manuscript so I get accurate, relevant answers.
- As a student, I want suggested starter questions so I know where to begin.
- As a student, I want my chat history saved so I can continue a previous conversation when I return.
- As a student, I want the AI to tell me which section of my thesis it is referencing so I can locate it.

### Tasks
- Create a `chat_history` table in Supabase with fields: `id`, `manuscript_id`, `user_id`, `messages` (jsonb array of `{role, content}` objects), `created_at`, `updated_at`. Enable RLS.
- Build a `POST /api/chat/message` endpoint. It receives the manuscript ID, the user's message, and the full conversation history so far. It fetches the manuscript text, builds a system prompt that grounds the AI strictly in the manuscript content, appends the new user message, calls Gemini, saves the updated history to the database, and returns the AI response.
- Build a `GET /api/chat/history/:manuscriptId` endpoint that returns the saved conversation history.
- On the client, build a Chat page at `/chat/:manuscriptId`.
- On load, fetch and display existing chat history if it exists.
- When the chat is empty, show 4–5 clickable suggested starter questions (e.g., "What is the main argument of my thesis?", "What methodology did I use and why?", "What are my key findings?").
- Build a scrollable message thread that distinguishes student messages from AI responses visually.
- Build a text input and Send button at the bottom. Disable input while the AI is responding.
- Auto-scroll to the latest message when new messages arrive.
- Wire up the "Chat" button on each manuscript card in the Dashboard to navigate to this page.

### Expected Output
- A student can ask a question and receive a response grounded in their thesis content within a few seconds.
- Clicking a suggested starter question sends it immediately.
- Refreshing the page restores the full conversation history.
- The AI response references specific parts of the manuscript.
- The "Chat" button on the Dashboard navigates to this page.

---

## Phase 5: Mock Defense

### Summary
The most immersive feature. The AI takes on the role of a strict academic panel examiner and conducts a full mock oral defense with the student. It asks tough questions one at a time, evaluates the student's answers, and provides a score and summary at the end. This is the highest-value feature for students preparing for their actual defense.

### User Stories
- As a student, I want the AI to ask me challenging questions about my thesis so I can practice defending it.
- As a student, I want the AI to respond to my answers and follow up with more questions so it feels like a real defense.
- As a student, I want the session to cover different areas of my thesis (methodology, literature, results, etc.) so I'm prepared for anything.
- As a student, I want to receive a score and feedback summary at the end of the session so I know how well I performed.
- As a student, I want to be able to see my past defense sessions so I can track my improvement over time.

### Tasks
- Create a `defense_sessions` table in Supabase with fields: `id`, `manuscript_id`, `user_id`, `messages` (jsonb), `score`, `summary`, `completed` (boolean), `created_at`, `updated_at`. Enable RLS.
- Build a `POST /api/mock-defense/message` endpoint. On the first call (no `sessionId`), create a new session and send only the system prompt to Gemini to get the opening question. On subsequent calls, append the student's answer to the conversation history, send the full history to Gemini, save the updated session, and return the AI response. The system prompt must instruct Gemini to play a strict examiner, ask one question at a time, vary question types across methodology/literature/results/framework/limitations, briefly evaluate each student answer before asking the next question, and after 8–10 exchanges deliver a final score from 1–10 and a session summary.
- Build a `GET /api/mock-defense/sessions/:manuscriptId` endpoint that lists past sessions for a manuscript.
- On the client, build a Mock Defense page at `/mock-defense/:manuscriptId`.
- When the page loads with no active session, show a "Start Mock Defense" screen with a brief explanation of what to expect and a Start button.
- After clicking Start, call the API to get the first question and display it in the chat UI.
- Style AI messages to look like examiner questions and student messages to look like answers — make the visual distinction clear.
- Disable the input and show a thinking indicator while waiting for the AI response.
- When the AI delivers a final score, show a session summary card with the score, key feedback points, and a "Try Again" button.
- Show a sidebar or tab listing past sessions with their scores so students can track progress.
- Wire up the "Mock Defense" button on each manuscript card in the Dashboard.

### Expected Output
- Clicking "Start Mock Defense" immediately delivers the first examiner question.
- The student can type answers and receive follow-up questions that reference their actual thesis.
- After 8–10 exchanges, the AI ends the session with a score and written summary.
- Past sessions are listed with their scores on the page.
- The "Mock Defense" button on the Dashboard navigates to this page.

---

## Phase 6: Panelist Recommendations

### Summary
After a real defense, panelists give written feedback requiring revisions before the thesis is approved. This feature lets students paste in those comments and get AI-generated rewrites of the affected manuscript sections. Each revision shows the original text, the revised version, and an explanation of what changed and why.

### User Stories
- As a student, I want to paste my panelists' comments so the AI can suggest how to revise my thesis.
- As a student, I want to see which section of my thesis each comment refers to so I know where to make changes.
- As a student, I want to see the original text next to the revised version so I can compare them clearly.
- As a student, I want an explanation for each revision so I understand why the change was made.
- As a student, I want to see my revision history so I can refer back to earlier suggestions.

### Tasks
- Create a `panelist_revisions` table in Supabase with fields: `id`, `manuscript_id`, `user_id`, `panelist_comments`, `revised_sections` (jsonb), `created_at`. Enable RLS.
- Build a `POST /api/recommendations/revise` endpoint. It receives the manuscript ID and the student's pasted panelist comments. It fetches the manuscript text, sends both to Gemini with a prompt instructing it to identify which sections each comment targets, rewrite those sections to address the feedback, and return a structured JSON array of revisions — each containing the original comment, the section name, the original text, the revised text, and an explanation.
- Build a `GET /api/recommendations/history/:manuscriptId` endpoint returning past revision requests for a manuscript.
- On the client, build a Recommendations page at `/recommendations/:manuscriptId`.
- Show a large textarea with placeholder text explaining what to paste (panelist comments, multiple comments are fine).
- Show a "Generate Revisions" button. Disable it while processing.
- Show a progress message during processing ("This takes about 20–30 seconds...").
- Display results as a list of revision cards. Each card shows: the panelist comment it addresses, the section name, the original text in a muted block, the revised text in a highlighted block, and the explanation below.
- Show a history panel listing previous revision requests by date so students can revisit them.
- Wire up the "Panelist Recs" button on each manuscript card in the Dashboard.

### Expected Output
- Pasting panelist comments and clicking "Generate Revisions" returns a structured list of section-by-section rewrites.
- Each revision card clearly shows what changed and why.
- Past revision requests are listed and can be referenced again.
- The "Panelist Recs" button on the Dashboard navigates to this page.

---

## Phase 7: Navigation, Layout & Polish

### Summary
Now that all four features work, unify the experience with a proper application shell. Students need a clear way to navigate between features, understand where they are, and have a polished, trustworthy-looking UI. This phase also handles error states, loading states, and mobile responsiveness that were deferred during feature development.

### User Stories
- As a student, I want a sidebar so I can navigate between my manuscripts and all four features quickly.
- As a student, I want to know which page I'm currently on so I don't get lost.
- As a student, I want the app to look professional so I trust it with my important thesis work.
- As a student, I want the app to work on my phone so I can practice on the go.
- As a student, I want to see clear error messages when something goes wrong so I'm not confused.
- As a student, I want toast notifications for successful actions (upload complete, analysis done) so I know things worked.

### Tasks
- Build a persistent sidebar layout component used by all protected pages. The sidebar shows: the app logo and name, a link to the Dashboard, and — when a manuscript is selected — links to all four features for that manuscript.
- Highlight the active navigation link so students always know where they are.
- Add a top bar with the student's name/email and a Sign Out button.
- On mobile (below `md` breakpoint), collapse the sidebar into a hamburger menu that opens as a drawer.
- Build a reusable `Toast` notification component and use it for: successful upload, successful analysis, successful revision generation, copy actions, and errors.
- Audit every page for missing loading states and add skeleton loaders or spinners where content is being fetched.
- Audit every API call for missing error handling. Show user-friendly error messages rather than raw error objects.
- Make sure all four feature pages handle the case where the manuscript has no extracted text (extraction failed during upload).
- Review every page on a 375px mobile screen and fix any layout issues.
- Add a 404 page for unknown routes.
- Clean up any placeholder UI from earlier phases (e.g., the health check test page from Phase 0).

### Expected Output
- Every page has a working sidebar with correct active link highlighting.
- On mobile, the sidebar opens and closes with a hamburger button.
- Toast notifications appear for all key actions.
- No page shows a blank screen or raw error when something fails — every error has a message.
- The app looks consistent and polished across all pages.
- The 404 page shows for unknown routes.

---

## Phase 8: Security, Rate Limiting & Deployment

### Summary
Before sharing the app with real students, harden the backend against abuse and deploy both services to production. This phase adds rate limiting to prevent excessive Gemini API usage, validates all inputs on the server, and gets the app live with proper environment configuration.

### User Stories
- As a developer, I want rate limiting on AI routes so one student cannot exhaust the API budget.
- As a developer, I want all user inputs validated on the server so malformed data cannot break the app.
- As a student, I want the app available at a real URL so I can use it from any device.
- As a developer, I want environment variables configured in production so secrets are never in source code.

### Tasks
- Add `express-rate-limit` to the server and apply it to all `/api/analysis`, `/api/mock-defense`, `/api/chat`, and `/api/recommendations` routes. Set a sensible limit (e.g., 15 AI requests per user per 15 minutes).
- Add server-side validation on all POST routes: check that required fields are present, that manuscript IDs belong to the authenticated user, and that text inputs are not empty.
- Add a maximum character limit when passing manuscript text to Gemini (truncate at 10,000 characters and log a warning if truncation occurs).
- Deploy the Express backend to Railway or Render. Set all environment variables in the platform dashboard.
- Deploy the React frontend to Vercel. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` (pointing to the deployed backend) in the Vercel project settings.
- Update Supabase Auth settings to allow the production frontend URL as a redirect URL.
- Update the backend CORS config to allow both the local dev URL and the production frontend URL.
- Smoke test every feature end-to-end in the production environment after deployment.
- Update the README with production deployment instructions.

### Expected Output
- Exceeding the rate limit returns a 429 response with a clear message.
- Sending a request with a missing required field returns a 400 response with a description of what is missing.
- The backend is live at a public URL and accepting requests.
- The frontend is live at a public URL and all four features work end-to-end in production.
- No API keys or secrets appear in the client-side code or browser dev tools.