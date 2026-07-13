# AI-Powered Alcohol Label Verification App

A standalone prototype for TTB-style alcohol beverage label review workflows. It extracts text from label images, compares key fields against submitted application data, and returns explainable verification results designed to reduce routine manual review time.

---

## Table of Contents
- [Deliverables Summary](#deliverables-summary)
- [Project Overview](#project-overview)
- [Approach](#approach)
- [Architecture](#architecture)
- [Quick Start (Local)](#quick-start-local)
- [Running Tests](#running-tests)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Assumptions, Trade-offs & Limitations](#assumptions-trade-offs--limitations)
- [Performance Notes](#performance-notes)

---

## Deliverables Summary

- **Source code repository:** this repository
- **Deployed prototype:** `https://alcohol-label-verifier.pages.dev/login`
- **This README includes:**
  - local setup and run instructions
  - deployment instructions
  - brief documentation of the approach
  - tools and technologies used
  - assumptions, trade-offs, and limitations

---

## Project Overview

### Features
- **Single-label verification** — Upload one label image and enter application fields; get field-by-field comparison results in seconds.
- **Batch verification** — Upload up to 300 labels in one run with per-item status, aggregate summary, and export to CSV/JSON.
- **Smart matching** — Normalization-based comparison distinguishes `exact`, `normalized` (fuzzy match), `mismatch`, and `missing` field states to avoid false rejections on trivial differences.
- **Government Warning strict checks** — 7-point validation: uppercase `GOVERNMENT WARNING:` header, canonical text similarity ≥ 90%, required clauses for pregnancy/birth defects, driving impairment, and Surgeon General attribution.
- **Explainable results** — Confidence score and notes per field; evidence snippets shown on expand.
- **Timing instrumentation** — Per-step timings (preprocess, OCR, validation, total) shown in the UI and included in JSON export.
- **Export** — Download individual verification results as JSON or batch results as CSV or JSON.
- **Health endpoint** — `GET /health` for monitoring.

---

## Approach

This prototype is designed around the core TTB review workflow described in the assignment:

1. **Upload a label image** and enter the application data that an agent would normally review.
2. **Run local OCR** to extract visible text from the label without depending on blocked external AI APIs.
3. **Normalize and compare fields** such as brand name, alcohol content, net contents, and bottler information.
4. **Apply stricter validation** to the Government Warning text, including required phrasing and formatting expectations.
5. **Return explainable results** with per-field comparisons, confidence, notes, and timings so the prototype supports human review rather than replacing it.

The app is intentionally a **standalone proof of concept** with mock authentication and in-memory batch state. It does not integrate with COLA and does not persist label records across restarts.

---

## Architecture

```
packages/
  backend/    Express + TypeScript API
    src/
      routes/       label, batch, auth, compliance, health
      services/     vision.service (OCR), validator.service, batch.service
      middleware/   auth, error handling, rate limiting
  frontend/   React 18 + Vite + Tailwind CSS SPA
    src/
      components/   LoginPage, Dashboard, SingleVerify, BatchUpload, VerificationResults, NavBar
      services/     api.ts (axios client)
      stores/       auth.store, label.store (Zustand)
  shared/     Shared TypeScript types and TTB constants
    src/
      types/        label.ts, auth.ts, api.ts
      constants/    ttb-requirements.ts
```

**Tools Used / Stack:**
- Backend: Node 20, Express 4, TypeScript, Tesseract.js (local offline OCR), JWT
- Frontend: React 18, Vite 5, Tailwind CSS 3, React Router 6, Zustand, Axios, react-dropzone
- Testing: Jest + Supertest (backend), Vitest + React Testing Library (frontend)
- Container: Docker multi-stage builds, nginx for frontend static serving

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Clone and install
```bash
git clone https://github.com/OPat2/alcohol-label-verifier.git
cd alcohol-label-verifier
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to a long random string
```

### 3. Start development servers
```bash
# Terminal 1 — backend (port 5000)
npm run dev -w packages/backend

# Terminal 2 — frontend (port 3000)
npm run dev -w packages/frontend
```

Open http://localhost:3000

**Demo sign-in:** use the demo credentials shown on the login page.

> **Prototype auth note:** Authentication is mocked for demo purposes and should be replaced with a real identity provider or user store in production.

### Using Docker Compose (recommended for full-stack)
```bash
cp .env.example .env
# Edit .env — set JWT_SECRET
docker compose up --build
```

App is at http://localhost:3000, API at http://localhost:5000.

---

## Running Tests

### Backend tests (Jest)
```bash
npm run test -w packages/backend
# With coverage:
npm run test:coverage -w packages/backend
```

### Frontend tests (Vitest)
```bash
npm run test -w packages/frontend -- --run
# Watch mode:
npm run test:watch -w packages/frontend
```

### All tests
```bash
# Backend + frontend (sequential):
npm run test -w packages/backend && npm run test -w packages/frontend -- --run
```

### CI
Tests run automatically on every push and pull request via GitHub Actions (`.github/workflows/ci.yml`). The workflow includes backend tests, frontend tests, TypeScript type-checks, and build verification.

---

## Environment Configuration

Copy `.env.example` to `.env` and adjust:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `API_PORT` | `5000` | Backend port |
| `JWT_SECRET` | — | **Required** — minimum 32 characters |
| `JWT_EXPIRY` | `24h` | Token expiry |
| `MOCK_VISION_API` | `false` | Set `true` to bypass Tesseract (for testing) |
| `MAX_BATCH_SIZE` | `300` | Max labels per batch |
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origins |

---

## Deployment

> **Recommended path:** Deploy the backend to Render (free tier, `render.yaml` included) and the frontend to Cloudflare Pages using the native GitHub integration. Both services auto-deploy on every push to `main` once connected — **no API tokens or GitHub secrets required**.

---

### Step 1 — Deploy the backend to Render (~5 min)

1. Go to [render.com](https://render.com) → sign in → **New → Blueprint Instance**.
2. Connect the `OPat2/alcohol-label-verifier` GitHub repository.  
   Render auto-detects `render.yaml` and shows one service: **label-verifier-api**.
3. Click **Apply** and wait for the green **Healthy** badge (first build ~3–4 min).
4. Copy the service URL shown in the dashboard, e.g.  
   `https://label-verifier-api.onrender.com`
5. Go to the service → **Environment** → add one variable:
   ```
   CORS_ORIGIN = https://alcohol-label-verifier.pages.dev
   ```
   *(Fill in the exact CF Pages URL after Step 2 if needed, then **Manual Deploy → Redeploy**.)*

---

### Step 2 — Deploy the frontend to Cloudflare Pages (~5 min, no secrets needed)

Cloudflare Pages can build and deploy directly from GitHub — no API tokens required.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages**.
2. Click **Connect to Git** → select the `OPat2/alcohol-label-verifier` repository → **Begin setup**.
3. Fill in the build settings:

   | Setting | Value |
   |---|---|
   | Project name | `alcohol-label-verifier` |
   | Production branch | `main` |
   | Framework preset | *None* |
   | Build command | `npm ci && npm run build -w packages/shared && npm run build -w packages/frontend` |
   | Build output directory | `packages/frontend/dist` |

4. Expand **Environment variables** and add:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://label-verifier-api.onrender.com/api` *(your Render URL from Step 1)* |

5. Click **Save and Deploy**.  
   Cloudflare assigns a permanent URL: `https://alcohol-label-verifier.pages.dev`  
   Every future push to `main` triggers an automatic redeploy.

---

### Step 3 — Verify

```bash
# Backend health check
curl https://label-verifier-api.onrender.com/health
# → {"status":"healthy","uptime":...}
```

Open `https://alcohol-label-verifier.pages.dev` and sign in using the demo credentials shown on the login page.

---

### Note on Render free tier cold starts

Render free services sleep after 15 minutes of inactivity and take ~30 s to wake. For a persistent demo, upgrade to the $7/mo Starter plan or add an uptime monitor (e.g. UptimeRobot pinging `/health` every 10 minutes).

---

### Option B — Automated deploys via GitHub Actions (wrangler-action)

If you prefer explicit CI/CD control, add these three secrets to **GitHub → Settings → Secrets → Actions** and the `.github/workflows/deploy.yml` workflow will deploy on every push:

| Secret | Where to find it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | CF dashboard → My Profile → API Tokens → Create Token → *Edit Cloudflare Workers* template |
| `CLOUDFLARE_ACCOUNT_ID` | CF dashboard → right sidebar on Workers & Pages overview page |
| `VITE_API_URL` | `https://label-verifier-api.onrender.com/api` |

---

### Option C — Docker Compose (self-hosted / local production)
```bash
export JWT_SECRET="$(openssl rand -base64 32)"
export NODE_ENV=production
docker compose up --build -d
# App at http://localhost:3000, API at http://localhost:5000
curl http://localhost:5000/health
```

---

### Health endpoint
```
GET /health
→ 200 { status: "healthy", uptime: 123.4, environment: "production" }
```

---

## API Reference

### Single Verification
```
POST /api/labels/verify
Content-Type: multipart/form-data

Fields:
  labelImage      image file (JPEG / PNG / WebP / TIFF, max 50 MB)
  applicationData JSON string of ApplicationData

Response: VerificationResult
```

### Batch (synchronous)
```
POST /api/batch/sync
Content-Type: multipart/form-data

Fields:
  labels[]        one or more image files
  applicationData JSON array of ApplicationData objects

Response: { batchId, status, results[], summary }
```

### Batch status
```
GET /api/batch/:batchId
→ { batchId, status, progress, results[], summary }
```

### Batch export
```
GET /api/batch/:batchId/export/csv   → CSV download
GET /api/batch/:batchId/export/json  → JSON download
```

### Compliance helpers
```
GET /api/compliance/warning-text   → canonical warning text
GET /api/compliance/ttb-fields     → required TTB fields list
```

---

## Assumptions, Trade-offs & Limitations

| Area | Decision | Rationale |
|---|---|---|
| **OCR** | Tesseract.js (local/offline) | Avoids blocked outbound API calls; no cloud dependencies; ~800 ms for a typical label |
| **Persistence** | In-memory (batch jobs) | Prototype scope; no DB required; jobs are lost on restart |
| **Auth** | Demo JWT with hardcoded mock users | Prototype only — replace with real identity provider for production |
| **Image quality** | Best-effort; returns partial results if OCR confidence is low | Graceful degradation; actionable error messages |
| **Government Warning** | Strict 7-point check; similarity threshold 90% | Mirrors real TTB requirement; warns on any deviation |
| **Batch size** | Default max 300 | Configurable; larger batches increase memory pressure without a queue |
| **No COLA integration** | Standalone prototype | As requested; COLA integration is a future procurement decision |

---

## Performance Notes

- **OCR target**: < 5 seconds per label on a modern server (Tesseract.js at ~800 ms for 750 KB JPEG).
- **Batch throughput**: Sequential by default; configurable concurrency via `MAX_BATCH_SIZE`.
- **Timing data** is included in every `VerificationResult` (preprocess / OCR / validation / total ms).
- **Cold start**: First Tesseract run downloads language data (~22 MB) once. Subsequent runs use the cached model.
- **Mock mode** (`MOCK_VISION_API=true`): bypasses OCR entirely; useful for CI and load-testing the validation logic.
