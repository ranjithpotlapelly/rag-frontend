# RAG Platform — Angular Frontend

A separate Angular 17 application (standalone components, signals) that consumes
the Spring Boot RAG backend API. Runs independently from the backend.

## Pages

| Route | Purpose | Backend endpoint |
|-------|---------|------------------|
| `/login` | Sign in | `POST /api/auth/token` |
| `/signup` | Create a company workspace | `POST /api/onboarding/signup` |
| `/chat` | Ask questions, see cited answers | `POST /api/query` |
| `/upload` | Drag-and-drop document ingestion | `POST /api/ingest` |
| `/dashboard` | Usage stats + quota | `GET /api/admin/dashboard/usage/{tenantId}` |
| `/billing` | Plans + Stripe checkout | `POST /api/billing/checkout` |

## Architecture

- **Standalone components** — no NgModules, lazy-loaded per route
- **Signals** — reactive state (auth, chat messages, usage)
- **HTTP interceptor** — attaches the JWT to every request; redirects to login on 401
- **Auth guard** — protects the authenticated routes
- **Proxy** — dev requests to `/api` are forwarded to `localhost:8080`

```
src/app/
├── core/
│   ├── services/      auth.service, rag.service
│   ├── interceptors/  auth.interceptor (JWT)
│   ├── guards/        auth.guard
│   └── models/        TypeScript interfaces mirroring backend DTOs
├── features/
│   ├── login/  signup/  chat/  upload/  dashboard/  billing/
└── shared/layout/     shell.component (sidebar + outlet)
```

## Run It

```bash
# 1. Install dependencies
npm install

# 2. Start backend first (separate terminal, in rag-system/)
#    docker compose up

# 3. Start the frontend dev server (proxies /api to :8080)
npm start
# → http://localhost:4200
```

## Connecting to the Backend

Dev uses `proxy.conf.json` to forward `/api/*` to `http://localhost:8080`,
avoiding CORS entirely in development. The backend also has a CORS config
allowing `http://localhost:4200` as a fallback.

In production: build with `npm run build:prod`, deploy the static `dist/`
output to a CDN or static host, and point `environment.prod.ts` `apiUrl`
at your deployed backend URL.

## Design

"Quiet intelligence" — a calm document-grey canvas, deep-indigo accent,
warm amber for actions. Inter typeface throughout. The interface is meant
to feel like a precise enterprise tool, not a flashy AI demo.
