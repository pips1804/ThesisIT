# DefenseReady

A thesis defense preparation web app for students. Upload your manuscript and practice with AI-powered mock defenses, analysis, chat, and panelist revision suggestions.

**Stack:** React (Vite) · Express · Supabase · Gemini API

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/apikey) Gemini API key

## Local setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run migrations in order:
   - `supabase/migrations/20260515000000_profiles.sql`
   - `supabase/migrations/20260515100000_feature_tables.sql`
3. Under **Authentication → Providers → Email**, enable email sign-in. For local dev, you can disable **Confirm email** for instant access.
4. Under **Authentication → URL configuration**, add redirect URLs:
   - `http://localhost:5173/**`
   - Your production URL (after deploy), e.g. `https://your-app.vercel.app/**`

### 2. Environment variables

**Client** — `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=
```

Leave `VITE_API_URL` empty in local dev (Vite proxies `/api` to port 3001).

**Server** — `server/.env`:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

Never commit `.env` files or expose the service role key or Gemini key to the client.

### 3. Run locally

```bash
cd server && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:3001  

## Features

| Area | Route |
|------|--------|
| Dashboard & uploads | `/dashboard` |
| Analysis | `/analysis/:manuscriptId` |
| Chat | `/chat/:manuscriptId` |
| Mock defense | `/mock-defense/:manuscriptId` |
| Panelist revisions | `/recommendations/:manuscriptId` |

- Sidebar navigation (desktop) and hamburger drawer (mobile)
- Toast notifications for uploads, analysis, revisions, copy, and errors
- AI rate limit: 15 requests per user per 15 minutes on Gemini routes
- Manuscript text sent to Gemini is truncated at 10,000 characters

## Production deployment

### Backend (Render)

1. Push the repo to GitHub.
2. Create a **Web Service** on [Render](https://render.com) using `server/render.yaml` or:
   - Root directory: `server`
   - Build: `npm install`
   - Start: `npm start`
3. Set environment variables in the Render dashboard:
   - `CLIENT_ORIGIN` — your Vercel URL, e.g. `https://defenseready.vercel.app`  
     (comma-separate multiple origins: `http://localhost:5173,https://defenseready.vercel.app`)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`
4. Note the public URL, e.g. `https://defenseready-api.onrender.com`

### Frontend (Vercel)

1. Import the repo on [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` — your Render API URL (no trailing slash)
4. Deploy. `client/vercel.json` handles SPA routing.

### Post-deploy checklist

- [ ] Supabase Auth redirect URLs include the Vercel domain
- [ ] `CLIENT_ORIGIN` on the server includes the Vercel URL
- [ ] Upload a PDF and run each AI feature once
- [ ] Confirm secrets are only in server env (not in client bundle except anon key)

## Project structure

```
client/          React + Vite frontend
server/          Express API
supabase/        SQL migrations
docs/            Phased development plan
```

See `docs/DEVELOPMENT_PHASE.md` for the full roadmap.
