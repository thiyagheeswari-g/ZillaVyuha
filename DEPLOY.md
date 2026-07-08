# DEPLOY.md — ZillaVyuha
# Complete Google Cloud Run Deployment Guide
# ─────────────────────────────────────────────────────────────────────────────
# Author        : Thiya
# Target         : Single Cloud Run service, single public URL
# GCP Project    : Already created with billing enabled ✅
# ─────────────────────────────────────────────────────────────────────────────
# ⚠ ANTIGRAVITY: Follow this file in EXACT order. Do not skip the
# "Discover Project Structure" step — the rest of this file depends on
# knowing whether frontend/backend are combined or separate before any
# Docker or gcloud command is run.
# ─────────────────────────────────────────────────────────────────────────────

---

## 0. Deployment Architecture — Decision Made For You

**Recommendation: ONE combined Cloud Run service, not two.**

Reasoning:
- One URL to submit (the hackathon asks for ONE "deployed prototype link")
- No CORS configuration needed between frontend and backend
- One deployment command, one thing that can fail, not two
- FastAPI can serve the React build's static files directly — no separate
  frontend hosting (Firebase Hosting, Vercel, etc.) needed

The pattern: FastAPI backend serves both the `/api/*` routes AND the
built React static files (`dist/` folder) from the same container, on
the same port, at the same URL.

```
https://zillavyuha-xxxxx.run.app/           → React app loads
https://zillavyuha-xxxxx.run.app/api/...    → FastAPI endpoints
```

---

## 1. Discover Project Structure First

```bash
# Run this and read the output before doing anything else
find . -maxdepth 2 -type d -not -path '*/node_modules*' -not -path '*/.git*'
cat package.json 2>/dev/null | head -20
find . -name "pyproject.toml" -o -name "requirements.txt" | grep -v node_modules
find . -name "main.py" -o -name "fast_api_app.py" | grep -v node_modules
```

Based on the output, determine:
- **Frontend folder** (contains `package.json`, likely `frontend/` or root)
- **Backend folder** (contains `pyproject.toml`/`requirements.txt`, likely
  `zillavyuha/` or `backend/`)
- Whether they are siblings in one repo, or genuinely two separate repos

**If two separate repos:** copy/clone both into one working directory
before proceeding — Cloud Run needs ONE Dockerfile that can see both.

Confirm the structure looks like one of these before continuing:

```
Structure A (monorepo, most likely):
zillavyuha/
├── frontend/          ← React + Vite
│   ├── package.json
│   └── src/
├── backend/  (or zillavyuha/)   ← FastAPI + ADK agents
│   ├── pyproject.toml
│   └── agent.py
└── Dockerfile          ← we create this now

Structure B (separate repos):
zillavyuha-frontend/    ← clone this into ./frontend
zillavyuha-backend/     ← clone this into ./backend
```

---

## 2. Pre-Deployment Checklist — Verify Before Building

```bash
# 2.1 Confirm .env is NOT tracked by git (critical — never deploy with
# committed secrets)
git ls-files | grep .env
# This should return NOTHING. If it returns a match, run:
#   git rm --cached .env
#   echo ".env" >> .gitignore
#   git commit -m "Remove .env from tracking"

# 2.2 Confirm the frontend builds locally without errors
cd frontend
npm install
npm run build
# Must produce a dist/ folder with no errors. If it fails, FIX THIS
# FIRST — a broken local build will fail identically in Cloud Run,
# just slower and harder to debug.
cd ..

# 2.3 Confirm the backend starts locally without errors
cd backend  # or zillavyuha/, whichever it is
uv sync
uv run python -m zillavyuha.fast_api_app  # or however it's started
# Confirm it starts on some port without crashing, then Ctrl+C
cd ..
```

**Do not proceed to Section 3 until both 2.2 and 2.3 pass cleanly.**

---

## 3. Create the Dockerfile

Place this at the **repo root** (same level as `frontend/` and `backend/`):

```dockerfile
# ─── Stage 1: Build the React frontend ───
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build
# Produces /app/frontend/dist

# ─── Stage 2: Python backend + serve built frontend ───
FROM python:3.11-slim AS final
WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy backend code
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --frozen --no-dev || uv sync --no-dev

COPY backend/ ./

# Copy the built frontend into a static folder the backend will serve
COPY --from=frontend-build /app/frontend/dist ./static

# Cloud Run injects PORT env var — the app MUST listen on it
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uv run uvicorn zillavyuha.fast_api_app:app --host 0.0.0.0 --port ${PORT}"]
```

**Adjust the CMD line's module path** (`zillavyuha.fast_api_app:app`) to
match whatever your actual FastAPI app instance is called and where it
lives — check the `if __name__ == "__main__"` block or `uvicorn.run(...)`
call in your existing backend startup file for the correct module:attribute
path.

---

## 4. Update FastAPI to Serve the React Build

**File target:** wherever your FastAPI `app = FastAPI()` instance is defined.

```python
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

# ... all your existing /api/... routes stay exactly as they are ...

# ADD THIS AT THE VERY END, after all /api routes are registered —
# order matters, this must be last so it doesn't swallow API routes
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")

app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """
    Catch-all: any route that isn't /api/* gets the React app's
    index.html, so React Router can handle client-side routing
    (e.g. /dashboard, /facilities, /reports all just load index.html
    and React Router takes over from there).
    """
    index_path = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(index_path)
```

**Critical:** confirm your React app's API calls use **relative paths**
(`/api/pipeline/run`) not absolute localhost URLs (`http://localhost:8000/api/...`).
Search for any hardcoded `localhost` in the frontend code:

```bash
grep -rn "localhost" frontend/src/
```

If any hardcoded `http://localhost:8000` or similar API base URLs exist,
replace them with relative paths (just `/api/...`) or an environment
variable that defaults to relative in production:

```tsx
// api/config.ts
export const API_BASE = import.meta.env.VITE_API_BASE || '';
// Use as: fetch(`${API_BASE}/api/pipeline/run`)
// In production (Cloud Run), API_BASE is empty string → relative path
// → hits the same origin, same container, no CORS issue
```

---

## 5. Handle the Gemini API Key Securely

**Never put the API key directly in the Dockerfile or commit it.** Use
Cloud Run's environment variable injection at deploy time instead.

```bash
# Recommended: Google Secret Manager (more secure, but one extra step)
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# If the secret already exists and you're updating it:
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
```

We'll reference this secret in the deploy command in Section 7 — no key
ever touches the Dockerfile or source code.

**Simpler alternative** (fine for a hackathon submission, slightly less
secure since it's visible via `gcloud run services describe`): pass the
key directly as a plain environment variable at deploy time (shown as
an option in Section 7 too).

---

## 6. Enable Required GCP APIs and Set Project

```bash
# Set your project (replace with your actual project ID)
gcloud config set project YOUR_PROJECT_ID

# Confirm it's set correctly
gcloud config get-value project

# Enable required APIs — safe to run even if already enabled
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Set a default region (Mumbai is closest to India-based judges/users;
# us-central1 is also fine and sometimes has better Cloud Run availability)
gcloud config set run/region asia-south1
```

**Replace `YOUR_PROJECT_ID`** with your actual GCP project ID — find it
by running `gcloud projects list` if you're not sure of the exact ID
(it may differ from the display name).

---

## 7. Build and Deploy

### Option A — Using Secret Manager (more secure)

```bash
gcloud run deploy zillavyuha \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 3 \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars="GEMINI_MODEL=gemini-2.5-flash"
```

### Option B — Direct env var (simpler, fine for hackathon submission)

```bash
gcloud run deploy zillavyuha \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars="GEMINI_API_KEY=YOUR_ACTUAL_KEY_HERE,GEMINI_MODEL=gemini-2.5-flash"
```

### What Each Flag Does
| Flag | Why |
|---|---|
| `--source .` | Builds directly from the Dockerfile in current dir via Cloud Build — no manual Docker push needed |
| `--allow-unauthenticated` | **Required** — judges need to access the URL without a Google login prompt |
| `--memory 2Gi` | Multi-agent pipeline + Gemini calls need headroom beyond the 512Mi default |
| `--timeout 300` | Gives the full 4-agent pipeline (each agent + MCP tool calls) up to 5 minutes — default 300s is usually enough, raise to 600 if you see timeout errors |
| `--min-instances 0` | Scales to zero when idle — costs nothing between judge visits |
| `--max-instances 3` | Caps cost/blast-radius, plenty for hackathon judging traffic |

This command will take **3-7 minutes** the first time (building the
Docker image via Cloud Build, then deploying). Watch the terminal output
— it will print a `Service URL` at the end. **That URL is your
submission's "Deployed prototype link."**

---

## 8. Post-Deployment Verification

```bash
# Get your deployed URL if you missed it in the output
gcloud run services describe zillavyuha --region asia-south1 --format='value(status.url)'
```

Open that URL in an **incognito/private browser window** (rules out any
cached local state) and manually verify, in order:

```
[ ] Page loads within 5-10 seconds (first request may be slower — "cold start")
[ ] Dashboard tab shows real data or a clean "no data yet" empty state
    (NOT the PHC-07 Sendurai mockup values from before)
[ ] Data Upload tab accepts the 5 sample CSVs
[ ] After upload, Multi-Agent Flow shows all 4 agents completing
[ ] Dashboard/Facilities/Alerts update with real Salem district data
    (PHC-041, PHC-046, etc.)
[ ] Approve/Reject buttons on Recommendations work and persist
[ ] Chatbot answers a real question using real data
[ ] Language toggle switches dashboard text
[ ] Reports page generates a real downloadable PDF
```

If ANY of these fail on the deployed URL but worked locally, it's almost
always one of these three causes — check in this order:

1. **Environment variable typo** — re-run `gcloud run services describe
   zillavyuha --region asia-south1` and check the env vars section matches
   exactly what you intended
2. **Relative path issue** — a hardcoded `localhost` URL slipped through
   Section 4's check
3. **Timeout** — check Cloud Run logs (`gcloud run services logs read
   zillavyuha --region asia-south1 --limit 50`) for timeout errors; raise
   `--timeout` and redeploy if needed

---

## 9. Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| "Container failed to start and listen on PORT" | App isn't reading the `PORT` env var Cloud Run injects | Confirm `uvicorn` command uses `--port ${PORT}`, not a hardcoded port like 8000 |
| Blank white page on the deployed URL | React build's `index.html` references assets with wrong paths | Check `vite.config.ts` has `base: '/'` (default, usually fine) |
| "404 Not Found" on page refresh at `/dashboard` | Catch-all route (Section 4) missing or registered before `/api` routes | Confirm catch-all is the LAST route registered in FastAPI |
| API calls fail with CORS error | Frontend still using absolute `http://localhost` URLs | Re-check Section 4's `grep -rn "localhost"` step |
| "Permission denied" during deploy | Billing not linked, or APIs not enabled | Re-run Section 6's `gcloud services enable` commands |
| Deploy succeeds but pipeline times out on real use | Cloud Run's default request timeout too short for the full 4-agent run | Add/increase `--timeout 600` and redeploy |
| Chatbot/report generation works locally, fails when deployed | `GEMINI_API_KEY` env var missing or wrong in Cloud Run config | Re-check Section 7's `--set-env-vars` or `--set-secrets` value |

---

## 10. Redeploying After Future Fixes

Any time you make more code changes before the deadline, redeploy with
the exact same command from Section 7 — Cloud Run will build a new
revision and route traffic to it automatically:

```bash
gcloud run deploy zillavyuha --source . --region asia-south1
# (only need to repeat the full flag list if you're changing memory/
# timeout/secrets — otherwise Cloud Run remembers the prior config)
```

---

## 11. Final Submission Checklist

```
[ ] Deployed URL tested in incognito browser — all 9 checks in Section 8 pass
[ ] Deployed URL added to your Hack2skill submission form
[ ] GitHub repo is public (or access explicitly granted to judges)
[ ] .env confirmed absent from the GitHub repo (re-check: git ls-files | grep .env)
[ ] README.md in the repo includes the deployed URL at the top, so
    anyone opening the repo immediately sees the live link too
```

---

*One service, one URL, one deploy command. Test in incognito before*
*submitting — that's the closest simulation of what a judge will actually see.*
