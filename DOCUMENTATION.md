# OnePrompt.ai — Complete Project Documentation

**Status:** Current as of the prepaid API + public site release (`47ffb73`, author date 2026-07-30).  
**Author / owner:** Arpit Rai  
**This file is the source of truth.** If another note in the repo disagrees with this file (including `PROJECT_KNOWLEDGE.md`), trust this file. Do not invent features that are not listed here. Do not paste real API keys, Mongo URIs, or Firebase / Razorpay / AWS secrets.

---

## Table of contents

1. [Identity and URLs](#1-identity-and-urls)
2. [What the product is](#2-what-the-product-is)
3. [What the product is not](#3-what-the-product-is-not)
4. [High-level architecture](#4-high-level-architecture)
5. [Repository and folder map](#5-repository-and-folder-map)
6. [Tech stack](#6-tech-stack)
7. [Frontend](#7-frontend)
8. [Backend services](#8-backend-services)
9. [Complete HTTP API](#9-complete-http-api)
10. [Public B2B API (`/v1`)](#10-public-b2b-api-v1)
11. [Authentication](#11-authentication)
12. [API keys](#12-api-keys)
13. [Credits, wallets, and Razorpay](#13-credits-wallets-and-razorpay)
14. [LangGraph and the eight agents](#14-langgraph-and-the-eight-agents)
15. [RAG (PDF Q&A)](#15-rag-pdf-qa)
16. [Models and third-party providers](#16-models-and-third-party-providers)
17. [Storage: MongoDB, Redis, S3, Qdrant](#17-storage-mongodb-redis-s3-qdrant)
18. [MongoDB schemas](#18-mongodb-schemas)
19. [BYOK](#19-byok)
20. [Organizations](#20-organizations)
21. [Async jobs and webhooks](#21-async-jobs-and-webhooks)
22. [Security model](#22-security-model)
23. [Environment variables](#23-environment-variables)
24. [How to run locally](#24-how-to-run-locally)
25. [Production hosting (what is actually live)](#25-production-hosting-what-is-actually-live)
26. [API tester app](#26-api-tester-app)
27. [How a request actually flows](#27-how-a-request-actually-flows)
28. [What is not implemented](#28-what-is-not-implemented)
29. [Known gaps and honest bugs](#29-known-gaps-and-honest-bugs)
30. [How to talk about this in an interview](#30-how-to-talk-about-this-in-an-interview)
31. [Quantifiers (code-backed)](#31-quantifiers-code-backed)

---

## 1. Identity and URLs

| Item | Value |
|------|--------|
| Product name | **OnePrompt.ai** |
| Older / folder name | CortexAI (`1.cortexAI`) |
| GitHub | https://github.com/Arpitrai073/OnePrompt.ai.git |
| Live site | https://onepromptai.duckdns.org |
| EC2 Elastic IP | `13.205.112.137` (AWS `ap-south-1` / Mumbai) |
| EC2 instance | `i-0aab44bdfe926a372`, name `oneprompt`, Ubuntu 24.04, t3.small, 20 GB gp3 |
| SSH key on the laptop | `C:\Users\arpit\Downloads\oneprompt-key.pem` (gitignored; never commit) |
| Firebase project | `cortex-474d1` |
| Branch | `main` |
| First commit | `f783309` — 29 July 2026 |
| Current product commit | `47ffb73` — “Add prepaid API, public site, and docs.” |

Related folder **not in this git repo:** `C:\Users\arpit\Downloads\1.cortexAI\oneprompt-api-tester` — local-only tester that calls `/v1/run`.

---

## 2. What the product is

OnePrompt is a **full-stack multi-agent AI SaaS** with two surfaces that share one engine:

1. **Playground (consumer)** — Google login, ChatGPT-style UI, conversation sidebar, prepaid **chat credits**. The user types one prompt. A LangGraph router sends it to a specialist agent.
2. **Public API (B2B)** — `sk_live_` Bearer keys created in **Develop**. Customer backends call `POST /v1/run`. Spend comes from a separate **API credits** wallet. Optional BYOK so model spend hits the customer’s Groq / Gemini / OpenRouter key.

It is **not** a foundation-model competitor. It is an **application / product layer**: orchestration, RAG, auth, billing, storage, keys, and a deployable host.

### Eight user-facing workflows

| # | Workflow | Agent node | What it does |
|---|----------|------------|--------------|
| 1 | Chat | `chat` | General conversation with short memory |
| 2 | Web search | `search` then `chat` | Tavily search, then chat synthesizes the answer |
| 3 | Code generation | `coding` | Structured files + Monaco artifact preview |
| 4 | PDF generation | `pdf` | PDFKit → S3 signed URL |
| 5 | PPT generation | `ppt` | pptxgenjs → S3 signed URL |
| 6 | Image generation | `vision` | Groq rewrites prompt → Pollinations.ai → S3 |
| 7 | Image analysis | `imageAnalyzer` | Gemini 2.5 Flash on an uploaded image |
| 8 | Document Q&A (RAG) | `pdfRag` | One-shot: attach a PDF on that request → chunk → embed → Qdrant → grounded answer |
| 9 | Workspace knowledge | `kb` | Named KBs; upload PDF/DOCX/TXT once, ask with `kbSlug` and no file |

Also: Google login, markdown replies, credit plans, PDF/image upload, Web Speech API mic, public Docs, Develop (keys / BYOK / activity / workspace).

---

## 3. What the product is not

Do **not** claim any of these. They are not implemented.

- Token streaming / SSE
- WebSockets / real-time push
- GraphQL
- A published SDK (npm / PyPI)
- SAML / SSO / enterprise IdP
- Conversation delete
- Multiple named knowledge bases, Google Drive sync, DOCX/OCR, or per-document ACLs (Phase 1 is **one corpus per workspace**)
- Automated test suite
- ECS / CloudFront / S3-hosted frontend as the **running** production path (there is an unused GitHub Actions workflow that targets that)
- Gemini **image generation** (Gemini = analysis + embeddings only)
- Tester app hosted on the live domain (it is local-only)

---

## 4. High-level architecture

```
Browser (React + Vite)
  │  cookie session for playground
  │  (API customers use Bearer from their own server)
  ▼
nginx on one EC2
  /            → static SPA  /var/www/oneprompt/frontend
  /api/*       → 127.0.0.1:8000   (cookies)
  /v1/*        → 127.0.0.1:8000   (Authorization)
  /health      → gateway /
  ▼
API Gateway :8000
  /api/auth*   → Auth    :8001
  /api/me      → Gateway itself
  /api/chat*   → Chat    :8002
  /api/agent*  → Agent   :8003
  /api/billing*→ Billing :8004
  /v1/run|jobs|files|audit|documents → Gateway controllers → Auth / Agent / Chat

Service-to-service (header x-internal-token = INTERNAL_SERVICE_SECRET):
  Agent   → Chat    save-message, get-messages
  Agent   → Auth    deduct-credits, byok-credentials
  Billing → Auth    update-plan
  Gateway → Auth    resolve-api-key, log-usage, jobs, webhooks
  Gateway → Agent   /chat, /sign-urls
  Gateway → Chat    create-conversation
```

**Gateway CORS:** `origin = FRONTEND_URL`, `credentials: true`.

**Two ways in:**

| Surface | Auth | Wallet deducted |
|---------|------|-----------------|
| Playground `/app` → `POST /api/agent/chat` | Cookie `session` | `credits` (playground) |
| Public API `POST /v1/run` | `Authorization: Bearer sk_live_…` | `apiCredits` (API) |

---

## 5. Repository and folder map

Git root: `C:\Users\arpit\Downloads\1.cortexAI\1.cortexAI`

```
1.cortexAI/
  DOCUMENTATION.md              ← this file
  PROJECT_KNOWLEDGE.md          ← older AI brief; superseded by this file
  .gitignore                    ← ignores .env, *.pem, serviceAccountKey.json
  .github/workflows/deploy.yml  ← ECR/ECS/S3/CloudFront — NOT used for live
  deploy/
    nginx.conf                  ← HTTP-only template; live HTTPS is edited on the server
    ec2-setup.sh
  frontend/
    src/App.jsx                 ← routes
    src/pages/                  ← Landing, Docs, AppShell, Develop, Home (unused)
    src/components/
    src/features/               ← Axios wrappers
    src/redux/                  ← user, conversation, message
    utils/axios.js
    utils/firebase.js
  backend/
    docker-compose.yml          ← local Redis only
    docker-compose.oracle.yml   ← production compose used on EC2
    .env.oracle.example
    gateway/
    services/auth/
    services/chat/
    services/agent/             ← LangGraph + 9 agents (incl. kb)
    services/billing/
    shared/                     ← redis, credits, cryptoByok, internalAuth
    secrets/serviceAccountKey.json  ← gitignored; mounted into auth container
```

`.env` files and `serviceAccountKey.json` are **never** committed.

---

## 6. Tech stack

### Frontend

- React 19, Vite 8, Tailwind CSS 4
- React Router 7 (`/`, `/docs`, `/app`, `/develop`)
- Redux Toolkit — 3 slices: `user`, `conversation`, `message`
- Axios `withCredentials: true`
- Firebase Auth (Google popup)
- Monaco Editor, react-markdown + remark-gfm, lucide-react, motion
- Razorpay Checkout (`window.Razorpay`, script in `index.html`)
- **No** streaming, WebSockets, or GraphQL

### Backend

- Node.js, Express 5, ES modules
- 5 microservices + Redis
- LangChain / LangGraph
- Mongoose + MongoDB Atlas (separate DB names per service)
- ioredis
- Firebase Admin (`serviceAccountKey.json`)
- Razorpay (INR, amount × 100 paise)
- AWS S3 (`@aws-sdk/client-s3` + presigner)
- Qdrant via `@langchain/qdrant`
- Multer (max 20 MB, PDF or `image/*`)
- PDFKit, pptxgenjs, pdf-parse, Tavily

### Infrastructure (live)

- One AWS EC2, Docker Compose, nginx, DuckDNS, Let’s Encrypt (certbot)
- Redis 7 Alpine in Compose
- MongoDB Atlas, Qdrant Cloud, AWS S3, Firebase, Razorpay, Groq, Gemini, OpenRouter, Tavily, Pollinations

---

## 7. Frontend

### Routes (`frontend/src/App.jsx`)

| Path | Page | Auth |
|------|------|------|
| `/` | `Landing` | Public |
| `/docs` | `Docs` | Public (`?tab=quickstart\|auth\|run\|agents\|async\|files\|errors\|pricing`) |
| `/app` | `AppShell` → playground | `RequireAuth` |
| `/develop` | `AppShell` → `Develop` | `RequireAuth` (`?panel=keys\|models\|activity\|workspace`) |
| `*` | Redirect `/` | — |

Boot: `GET /api/me` → `setUserdata` + `setAuthReady`. Unauthenticated visits to `/app` or `/develop` redirect to `/`.

### Pages

- **Landing** — product story, playground vs API, sample `fetch` using `getPublicApiBase()`, footer “Made with Heart by Arpit Rai”.
- **Docs** — shareable tabs. Base URL is this site’s origin when hosted (`https://onepromptai.duckdns.org`), never a baked-in localhost in production.
- **AppShell** — `SideBar` + either `Develop` or `ChatArea` + `Artifact`.
- **Develop** — keys, BYOK models, Knowledge (named KBs, PDF/DOCX/TXT, quotas), usage/jobs/audit CSV, org workspace.
- **Home.jsx** — **not routed**. Legacy CortexAI shell. Ignore it.

### Components

| File | Job |
|------|-----|
| `SiteHeader.jsx` | Sticky header on Landing/Docs |
| `Logo.jsx` | Chevron + dot mark; collapsed sidebar uses `LogoMark` to **expand**, not to go `/` |
| `ProductPreview.jsx` | Static mock on Landing |
| `CodeBlock.jsx` | Copyable snippets |
| `SideBar.jsx` | New Chat, Develop, Docs, conversations, plan badge, billing, logout |
| `ChatArea.jsx` | Nav + messages + input |
| `Nav.jsx` | Conversation title + count |
| `MessageList.jsx` | Empty state, starter chips, bubbles, loading |
| `MessageBubble.jsx` | Markdown, images, code |
| `ChatInput.jsx` | Agent chips, file, mic, send |
| `LoadingAnimation.jsx` | Thinking states |
| `Artifact.jsx` | Monaco + HTML iframe preview |
| `BillingDrawer.jsx` | Dual-wallet balances + Razorpay |

There is **no** pencil / “edit conversation” icon (removed; it duplicated New Chat).

### Agent chips (`ChatInput.jsx`)

Default label `Auto`. Sent as lowercase `agent`: `auto`, `chat`, `coding`, `pdf`, `ppt`, `vision`, `search`.

**Critical routing rules (UI chip vs Auto + file):**

- **PDF chip** → PDF **generation**, even if a PDF is attached.
- **Auto + uploaded PDF** → `pdfRag` (Q&A).
- **Vision chip** → image **generation**.
- **Auto + uploaded image** → `imageAnalyzer`.

File input: `.pdf,image/*`, 20 MB on the server.

### Redux

| Slice | Fields |
|-------|--------|
| `user` | `userData`, `authReady` |
| `conversation` | `conversations`, `selectedConversation` |
| `message` | `messages`, `artifacts`, `isLoading`, `draftPrompt` |

`userData` fields the UI actually reads: `_id`, `name`, `avatar`, `credits`, `totalCredits`, `apiCredits`, `plan`, `apiPlan`, `byokEnabled`.

### Axios and public base URL

- `frontend/utils/axios.js`: `baseURL = VITE_SERVER_URL || ""`. Empty = same-origin `/api` via nginx.
- Local laptop `.env` uses `VITE_SERVER_URL=http://localhost:8000`.
- **Production build on EC2 must leave `VITE_SERVER_URL` empty.**
- `publicApiBase.js`: on localhost → `VITE_SERVER_URL` or origin; on any hosted host → `window.location.origin`. Docs therefore show `https://onepromptai.duckdns.org`, not localhost, when the live site is open.

### Frontend API wrappers (`src/features/`)

All cookie-authenticated unless noted.

| Module | Call |
|--------|------|
| `getCurrentUser` | `GET /api/me` |
| `googleLogin` | Firebase popup → `POST /api/auth/login` `{ token }` |
| `logOut` | `GET /api/auth/logout` |
| `createConversation` | `GET /api/chat/create-conversation` |
| `getConversations` | `GET /api/chat/get-conversations` |
| `getMessages` | `GET /api/chat/get-messages/:id` |
| `updateConversation` | `POST /api/chat/update-conversation` |
| `sendMessage` | `POST /api/agent/chat` (FormData) |
| `createOrder` | `POST /api/billing/create` `{ plan }` — throws if no `order.id` |
| `verifyPayment` | `POST /api/billing/verify` |
| `apiKeys.js` | keys, usage, BYOK, org, jobs |
| `documents.js` | list / upload / poll / delete workspace docs via `/v1/documents` |
| `knowledgeBases.js` | list / create / delete named KBs via `/v1/knowledge-bases` |
| `planDisplay.js` | `formatPlan`, `accountStatus` (`N chat · M API`) |
| `publicApiBase.js` | Docs / landing snippets |

Develop also does `GET /api/auth/audit?format=csv` as a blob download.

### Plan badge

`planDisplay.accountStatus`: paid plan name if not free, else leftover count. Subtitle is always **chat credits · API credits**, not just “free plan”.

---

## 8. Backend services

| Service | Port | Process | Global extra |
|---------|------|---------|--------------|
| Gateway | 8000 | `backend/gateway` | CORS, cookie-parser, webhook worker |
| Auth | 8001 | `backend/services/auth` | Cookie-parser; **not** globally internal-token |
| Chat | 8002 | `backend/services/chat` | `requireInternalToken` on all routes |
| Agent | 8003 | `backend/services/agent` | `requireInternalToken` + error handler |
| Billing | 8004 | `backend/services/billing` | `requireInternalToken` |
| Redis | 6379 | `redis:7-alpine` | Persistence volume `redis_data` |

If `INTERNAL_SERVICE_SECRET` is **unset**, internal middleware **passes through** (dev foot-gun). Production Compose always sets it.

Agent Mongo URI exists in Compose but **agent has no Mongoose models**. Chat/auth/billing own the collections.

---

## 9. Complete HTTP API

Paths below are as the **browser or customer** sees them (gateway prefixes). Service-root paths are the same without `/api/{service}`.

### Auth — `/api/auth`

| Method | Path | Who | Auth |
|--------|------|-----|------|
| POST | `/api/auth/login` | Frontend | Public. Body `{ token }` Firebase ID token. Sets `session` cookie. Returns User. |
| GET | `/api/auth/logout` | Frontend | Public. Clears cookie + Redis session. |
| POST | `/api/auth/update-plan` | Billing | Internal. `{ userId, plan, credits, wallet? }` |
| POST | `/api/auth/deduct-credits` | Agent | Internal. `{ userId, agent, billingMode?, keyId? }` → 402 if empty |
| POST | `/api/auth/keys` | Develop | Cookie + internal. `{ name?, dailyCreditCap?, webhookUrl?, ipAllowlist? }`. **201** + one-time `key` |
| GET | `/api/auth/keys` | Develop | Cookie |
| POST | `/api/auth/keys/:id` | Develop | Update cap / webhook / allowlist |
| POST | `/api/auth/keys/:id/revoke` | Develop | |
| POST | `/api/auth/keys/:id/rotate` | Develop | **201** new secret |
| GET | `/api/auth/usage` | Develop | Last 20 `ApiUsage` |
| GET | `/api/auth/usage/:requestId` | Gateway files | |
| GET | `/api/auth/audit` | Develop / `/v1/audit` | Query `from`, `to`, `format=csv` |
| GET/POST | `/api/auth/byok` | Develop | Toggle + encrypt provider keys |
| GET/POST | `/api/auth/org` | Develop | Workspace |
| POST | `/api/auth/org/invite` | Develop | `{ email, role? }` |
| POST | `/api/auth/org/join` | Develop | `{ inviteCode? }` |
| POST | `/api/auth/org/members/:id/remove` | Develop | |
| GET | `/api/auth/jobs` | Develop | Last 20 jobs (not on `/v1`) |
| GET | `/api/auth/jobs/:jobId` | `/v1/jobs` | |
| POST | `/api/auth/documents` | Develop / gateway. Create `processing` row. Owner/admin or API key |
| GET | `/api/auth/documents` | List. Any org member |
| GET | `/api/auth/documents/:id` | One document |
| DELETE | `/api/auth/documents/:id` | Owner/admin or API key. Metadata only (gateway also deletes Qdrant/S3) |

**Internal-only (gateway / services, not for browsers):**

- `POST /internal/resolve-api-key`
- `POST /internal/log-usage`
- `POST /internal/byok-credentials`
- `POST /internal/jobs`, `POST /internal/jobs/:jobId`
- `POST /internal/webhooks`, `GET /internal/webhooks/due`, `POST /internal/webhooks/:id/ack`
- `POST /internal/documents/:id` (ingest status: ready / failed, chunkCount, s3Key)

### Chat — `/api/chat`

| Method | Path | Notes |
|--------|------|--------|
| GET | `/create-conversation` | Needs `x-user-id` |
| GET | `/get-conversations` | Needs `x-user-id` |
| POST | `/update-conversation` | `{ id, title }` — **no ownership check** |
| POST | `/save-message` | Agent writes `{ conversationId, role, content, images?, artifacts? }` |
| GET | `/get-messages/:conversationId` | **no ownership check** |

### Agent — `/api/agent`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/chat` | Multipart: `prompt`, `conversationId`, `agent`, optional `file`. Returns `{ ok, answer, images, artifacts, agent, s3Keys, billingMode }` |
| POST | `/sign-urls` | Internal. `{ keys }` → presigned GETs |

### Billing — `/api/billing`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/create` | `{ plan }` one of `starter`, `pro`, `api_starter`, `api_pro`. Returns `{ order, plan }`. Amount = rupees × 100. |
| POST | `/verify` | Razorpay HMAC `order_id\|payment_id`. Credits the matching wallet. |

### Gateway extras

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | `{ message: "hello from gateway v5" }` |
| GET | `/api/me` | Current session user (cookie or Bearer) |
| POST | `/v1/run` | See §10 |
| GET | `/v1/files/:requestId` | Refresh signed URLs |
| GET | `/v1/jobs/:jobId` | Poll async job |
| GET | `/v1/audit` | JSON or CSV |
| GET | `/v1/knowledge-bases` | List named KBs + org quota |
| POST | `/v1/knowledge-bases` | Create KB `{ name, slug }` |
| DELETE | `/v1/knowledge-bases/:id` | Delete empty KB (or `force=true`) |
| GET | `/v1/documents` | List docs (`?kbId=` / `?kbSlug=`) + quota |
| GET | `/v1/documents/:docId` | Poll single document status |
| POST | `/v1/documents` | Multipart `file` + `kbSlug` + optional `acl`. PDF/DOCX/TXT. Default **202** async; `?sync=true` waits |
| POST | `/v1/documents/:docId/acl` | Update `{ mode, roles, userIds }` (owner/admin) |
| DELETE | `/v1/documents/:docId` | Remove vectors, S3 original, and metadata |

---

## 10. Public B2B API (`/v1`)

Nginx forwards `/v1/` including the `Authorization` header. Gateway `protect` accepts **cookie or Bearer**. Customer apps must use Bearer from a **server**. Docs say: do not put `sk_live_` in a browser or mobile app.

### `POST /v1/run`

**Auth:** `Authorization: Bearer sk_live_…`  
**Optional:** `Idempotency-Key` (Redis 24h). In-flight → **409**. Replay returns the stored body.

**JSON (prompt only):**

```json
{
  "prompt": "say hello",
  "agent": "chat",
  "async": false,
  "conversationId": "optional"
}
```

`input` is accepted as an alias of `prompt`. `agent` optional (default auto/router).

**Multipart:** field `file` plus `prompt`, `agent`, optional `async`. Required for PDF / image upload. JSON cannot attach a file.

**Sync success (typical 200):**

```json
{
  "ok": true,
  "agentUsed": "chat",
  "answer": "…",
  "files": [],
  "images": [],
  "artifacts": [],
  "creditsUsed": 1,
  "billingMode": "platform",
  "requestId": "…",
  "conversationId": "…"
}
```

**Async:** body or query `async: true` → **202**

```json
{
  "ok": true,
  "async": true,
  "status": "queued",
  "jobId": "…",
  "requestId": "…",
  "message": "Poll GET /v1/jobs/:jobId or wait for the webhook."
}
```

Then `GET /v1/jobs/:jobId` until `succeeded` or `failed`.

**IP allowlist:** if the key has `ipAllowlist`, gateway compares `X-Forwarded-For` / `X-Real-IP` / `req.ip`.

**Billing mode:** `byok` if `user.byokEnabled`, else `platform`. Sent to agent as `x-billing-mode`. Playground `/api/agent/chat` currently **does not** set that header (see §29).

### `GET /v1/files/:requestId`

Looks up `ApiUsage.s3Keys`, asks agent to sign, returns `{ ok, requestId, files, expiresIn: "24h" }`.

### `GET /v1/jobs/:jobId`

`{ ok, jobId, requestId, status, agent, result, error }`  
`status`: `queued` | `running` | `succeeded` | `failed`.

### `GET /v1/audit`

Same as auth audit (JSON or `format=csv`).

### Workspace knowledge bases & documents

- `POST /v1/knowledge-bases` — `{ name, slug }` (slug optional; `default` is reserved and auto-created).
- `GET /v1/knowledge-bases` — list KBs plus `{ usedDocuments, maxDocuments, usedBytes, maxBytes }`.
- `DELETE /v1/knowledge-bases/:id` — blocked if not empty unless `force=true`; cannot delete `default`.
- `POST /v1/documents` — multipart `file` (PDF / DOCX / TXT / PNG / JPG / WEBP, 20 MB) plus optional `kbId` or `kbSlug` (default `default`). Returns **202** `{ async, status: "processing", document, jobId }`. Poll `GET /v1/jobs/:jobId` or `GET /v1/documents/:docId`. Pass `?sync=true` to wait for indexing (handy for Develop). Credits for ingest charge when the worker starts.
- **OCR:** digital PDFs use `pdf-parse` first. If the text looks empty/sparse (typical scan), Gemini (`KB_OCR_MODEL` or `gemini-2.5-flash`) OCRs the PDF. Image uploads always go through OCR. Needs `GOOGLE_API_KEY` (or BYOK Gemini). Slower/costlier than text-only PDFs; very large scans may hit model size limits.
- `GET /v1/documents` — filter `?kbSlug=` / `?kbId=`; includes quota summary.
- `DELETE /v1/documents/:docId` — delete vectors, S3 object, and Mongo row.

Qdrant: default KB keeps legacy collection `kb-{orgId}`; named KBs use `kb-{orgId}-{slug}`. Originals at `kb/{orgId}/{kbSlug}/{docId}.{ext}`.

Org quotas (from owner `apiPlan`): free **50 docs / 200 MB**; `api_starter` **200 / 1 GB**; `api_pro` **1000 / 5 GB**. Exceeding returns **402** `quota_exceeded`.

Then ask with no file:

```json
{ "prompt": "What is the refund window?", "agent": "kb", "kbSlug": "handbook" }
```

Success includes `sources: [{ docId, filename, kbSlug }]`. Empty KB returns **409** `knowledge_base_empty`. Normal `auto` chat never searches this corpus. Attaching a PDF to `/v1/run` still uses one-shot `pdfRag`.

**Per-document ACL (Batch B):** each document has `acl: { mode, roles, userIds }`.
- `mode: "org"` (default) — every active org member can read
- `mode: "roles"` — only listed roles (`owner` / `admin` / `member`); typical HR lock: `roles: ["owner","admin"]`
- `mode: "users"` — only listed `userIds` (plus the uploader)
- Workspace **owners always** read every document
- List + `agent=kb` search only include documents the caller can read (Qdrant filtered by allowed `docId`s)
- Set on upload (`acl` form JSON / `aclMode`) or `POST /v1/documents/:docId/acl`

### Errors (typical)

| HTTP | Meaning |
|------|---------|
| 401 | Missing / bad cookie or key |
| 402 | Not enough credits |
| 403 | IP allowlist miss |
| 404 | Unknown job / usage |
| 409 | Idempotency key in flight, or knowledge base empty |
| 429 | Rate limit |

Rate limits (per user **and** per key, 60s window): chat 20/min; coding, pdf, ppt, image, search 5/min.

---

## 11. Authentication

### Playground (cookie)

1. Google `signInWithPopup`
2. `getIdToken()` → `POST /api/auth/login`
3. Auth verifies token with Firebase Admin, upserts `User`
4. Redis:
   - `session-{uuid}` = user payload, TTL **7 days**
   - `user-session-{userId}` = current session id, TTL **7 days**
5. Cookie `session` = that UUID, httpOnly, sameSite strict, `secure` if `COOKIE_SECURE=true`
6. Later requests: Gateway `protect` loads Redis. `proxyWithHeader` adds `x-user-id`.

Production: `COOKIE_SECURE=true`, `FRONTEND_URL=https://onepromptai.duckdns.org`.  
Firebase authorized domains must include `onepromptai.duckdns.org`.

Logout deletes `session-{id}` and clears the cookie.

### API (Bearer)

1. User creates a key in Develop.
2. Gateway `protect` sees `Authorization: Bearer sk_live_…`
3. Auth `POST /internal/resolve-api-key` (SHA-256 hash lookup)
4. `req.user` is the **key owner** (or org billing owner). `x-api-key-id` is forwarded.

`GET /api/me` works with either cookie or Bearer.

---

## 12. API keys

- Format: `sk_live_` + 48 hex characters.
- Only the **hash** is stored (`keyHash` unique). Raw secret shown **once** on create/rotate.
- Fields: `name`, `prefix`, `userId`, `orgId`, `active`, `dailyCreditCap`, `webhookUrl`, `ipAllowlist`.
- Mutations require org **owner** or **admin** (`canManageKeys`).
- Revoke is instant (`active: false`).
- Rotate issues a new secret; old hash is replaced.

---

## 13. Credits, wallets, and Razorpay

### Two wallets on `User`

| Wallet | Fields | Used by |
|--------|--------|---------|
| Playground | `credits`, `plan`, `planExpiresAt`, `totalCredits` | Cookie chat `/api/agent/chat` |
| API | `apiCredits`, `apiPlan`, `apiPlanExpiresAt` | Bearer `/v1/run` (`keyId` present) |

New users: **100** playground credits and **100** API credits, plan `free`.

Deduction: if `keyId` is present → API wallet (org owner if the key has `orgId`); else playground.

### Platform credit costs (`shared/credits.js`)

| Agent | Platform | BYOK fee |
|-------|----------|----------|
| chat, auto | 1 | 1 |
| search | 5 | 1 |
| coding | 10 | 1 |
| pdf, ppt, vision, pdfRag, image, kb, kbIngest | 10 | 2 |
| imageAnalyzer | 10 | 1 |

Unknown agent → 1. `imageAnalyzer` currently deducts using the name `vision` in the agent file (same platform cost 10). `pdfRag` deducts as `pdf` in older deduct paths; the shared table has both keys at 10.

Search graph is `search → chat`. Search deducts search; chat may also deduct — **possible double charge** (known gap).

### Paid plans (`Plans.js`)

| id | INR | Credits | Wallet |
|----|-----|---------|--------|
| free | 0 | 100 | playground (default) |
| starter | 199 | 500 | playground |
| pro | 499 | 1000 | playground |
| api_starter | 299 | 2000 | **api** |
| api_pro | 799 | 8000 | **api** |

Validity field: 30 days. `planExpiresAt` / `apiPlanExpiresAt` set to now + 30d on purchase.

### Razorpay

1. `POST /api/billing/create` `{ plan }` → `orders.create({ amount: plan.amount * 100, currency: "INR" })` → persist `Payment` `created`.
2. Frontend opens Checkout **only if** `order.id` exists.
3. `POST /api/billing/verify` HMAC-SHA256 of `order_id|payment_id` with `RAZORPAY_KEY_SECRET`.
4. Payment `paid` → Auth `update-plan` with the plan’s `wallet`.
5. Frontend then `GET /api/me` so Redux shows remaining chat · API credits.

Key id and secret on the **server** must be a matching pair. Test keys live in server `backend/.env` and frontend `VITE_RAZORPAY_KEY_ID`. Never commit them.

---

## 14. LangGraph and the eight agents

File: `backend/services/agent/graph/graph.js`

**State:** `prompt`, `aiResponse`, `agent`, `conversationId`, `searchResults`, `images`, `artifacts`, `userId`, `file`, `billingMode`, `providerKeys`, `keyId`, `s3Keys`.

**Graph:**

```
start → router → (one of 8 agents) → end
                 search → chat → end
```

Unknown agent falls through to `chat`.

### Router (`graph/router.js`) — hybrid

1. If `state.agent` is set and **not** `"auto"` → use that node (UI chip / API `agent=`).
2. Else if file MIME `application/pdf` → `pdfRag`.
3. Else if file MIME starts with `image/` → `imageAnalyzer`.
4. Else LLM (Groq) classifies: chat | search | coding | pdf | ppt | vision.

### Agent files

| File | Job |
|------|-----|
| `chat.agent.js` | Memory + optional search context; markdown |
| `search.agent.js` | Tavily (max 5, include images) |
| `coding.agent.js` | Intent LLM; multi-file JSON artifact or markdown |
| `pdf.agent.js` | Outline JSON → PDFKit → S3 |
| `ppt.agent.js` | Slides JSON → pptxgenjs → S3 |
| `vision.agent.js` | Prompt polish → Pollinations → S3 |
| `pdfRag.agent.js` | Uploaded PDF Q&A (one-shot, new collection per request) |
| `kb.agent.js` | Named workspace corpora (`kb-{orgId}` default, `kb-{orgId}-{slug}` otherwise) |
| `imageAnalyzer.agent.js` | Gemini multimodal |

### Controller sequence (`agent.controller.js`)

1. Require `x-user-id`
2. Save user message to Chat
3. Optional BYOK credential fetch
4. `graph.invoke`
5. Redis `addMessage`
6. Save assistant message
7. JSON `{ ok, answer, images, artifacts, agent, s3Keys, billingMode }`

No SSE. The playground waits for the full JSON.

---

## 15. RAG (PDF Q&A)

Implemented. Qdrant Cloud is a **real vector database**.

Pipeline (`pdfRag.agent.js`):

1. Rate limit + deduct
2. Read uploaded PDF from disk, `pdf-parse`
3. `RecursiveCharacterTextSplitter` **chunkSize 1000, overlap 200**
4. Gemini embeddings `gemini-embedding-001`
5. `QdrantVectorStore.fromDocuments` — collection `pdf-{tenant}-{keyPart}-{timestamp}` (**new collection per upload**)
6. `similaritySearch(prompt, 5)`
7. LLM (`getModel("pdf-rag")` → Groq on platform) answers **only from context**, or “I couldn't find this information in the uploaded PDF.”
8. Temp file deleted in `finally`

**In Qdrant:** chunk text + vectors.  
**Not in Qdrant:** users, chats, original PDF bytes, payments, generated images.

One-shot `pdfRag` still creates a **new** collection per upload (`pdf-{tenant}-{key}-{timestamp}`). An agent worker deletes `pdf-*` collections older than **7 days** (`PDF_RAG_COLLECTION_TTL_DAYS`); it never touches `kb-*`.

**Workspace knowledge (`kb`)** is separate: stable collections per KB (`kb-{orgId}` for `default`, else `kb-{orgId}-{slug}`). Payloads include `orgId`, `kbId`, `kbSlug`, `docId`, `filename`, `chunkIndex`. Delete a document removes those points plus the S3 original. Ask with `agent=kb`, optional `kbSlug`, and no file. Ingest accepts PDF, DOCX (mammoth), and TXT.

---

## 16. Models and third-party providers

| Job | Provider | Env | Model / note |
|-----|----------|-----|----------------|
| Chat, router, search synthesis, pdf/ppt plan, RAG answer, vision prompt rewrite | Groq | `GROQ_API_KEY` | `openai/gpt-oss-120b` |
| Coding | OpenRouter | `OPENROUTER_API_KEY` | `deepseek/deepseek-chat` |
| Image analysis | Gemini | `GOOGLE_API_KEY` | `gemini-2.5-flash` |
| Embeddings | Gemini | `GOOGLE_API_KEY` | `gemini-embedding-001` |
| Web search | Tavily | `TAVILY_API_KEY` | max 5 |
| Image generation | Pollinations | none | HTTP GET, no key |
| Vectors | Qdrant Cloud | `QDRANT_URL`, `QDRANT_API_KEY` | |
| Generated files | AWS S3 | `AWS_*` | PDFs, PPTs, images |
| Payments | Razorpay | `RAZORPAY_KEY_*` | INR |
| Login | Firebase | Admin JSON + `VITE_FIREBASE_API_KEY` | Google |

`getModel()` / `providerForAgent()`: `coding` → openrouter, `imageAnalyzer` → gemini, everything else → groq.

**Gemini does not generate images.**

BYOK can replace Groq / Gemini / OpenRouter keys per user when `byokEnabled` and `x-billing-mode=byok`.

---

## 17. Storage: MongoDB, Redis, S3, Qdrant

### MongoDB Atlas — service-isolated URIs

| URI env | DB role |
|---------|---------|
| `MONGODB_URI_AUTH` | User, ApiKey, ApiUsage, ApiJob, Organization, OrgMember, WebhookEvent, LlmProviderKey |
| `MONGODB_URI_CHAT` | Conversation, Message |
| `MONGODB_URI_BILLING` | Payment |
| `MONGODB_URI_AGENT` | Connected; **no models** |

### Redis

| Key | TTL | Purpose |
|-----|-----|---------|
| `session-{uuid}` | 7d | Session JSON |
| `user-session-{userId}` | 7d | User → session id |
| `idem:{userId}:{key}` | 24h | Idempotency |
| `messages-{conversationId}` | 24h on first fill; **SET without EX on later addMessage** | Last ~20 messages |
| `rate:{userId}:{agent}` | 60s | Per-user rate |
| `rate:key:{keyId}:{agent}` | 60s | Per-key rate |

### S3

Used for generated PDFs, PPTs, images, and **workspace knowledge originals** at `kb/{orgId}/{kbSlug}/{docId}.{ext}`. Frontend is **not** on S3; nginx serves `dist/`.

Presign expiry is inconsistent in code: some calls pass `24*60` (AWS treats as **seconds** ≈ 24 min), ppt and `/v1/files` use 24h. UI/docs sometimes say “10 minutes”. See §29.

### Qdrant

See §15. One-shot `pdfRag` = new collection per upload (TTL cleanup after 7d). Workspace `kb` = per-KB collections (`kb-{orgId}` for default, else `kb-{orgId}-{slug}`).

---

## 18. MongoDB schemas

### User (auth)

`firebaseUid` unique; `name`, `email`, `avatar`; `plan` default `free`; `credits` / `totalCredits` default 100; `planExpiresAt`; `byokEnabled` default false; `apiPlan` default `free`; `apiCredits` default 100; `apiPlanExpiresAt`; timestamps.

### ApiKey

`name`, `keyHash` unique, `prefix`, `userId`, `active`, `dailyCreditCap`, `webhookUrl`, `orgId`, `ipAllowlist[]`, timestamps.

### ApiUsage

`requestId` unique; `userId`; `keyId`, `agent`, `error`, `idempotencyKey`, `orgId`; `status` success|error; `creditsUsed`; `s3Keys[]`; `billingMode` platform|byok; `wallet` playground|api; timestamps.

### ApiJob

`jobId` unique; `requestId`, `keyId`, `orgId`, `agent`, `error`; `userId`; `status` queued|running|succeeded|failed; `result` Mixed; timestamps.

### Organization / OrgMember

Org: `name`, `ownerId`, `inviteCode` unique, `allowedDomain`.  
Member: `orgId`, `userId`, `email`, `role` owner|admin|member, `status` active|invited; unique `{ orgId, email }`.

### WebhookEvent

`url`, `payload`, `attempts` (max 5), `nextRetryAt`, `status` pending|delivered|failed, `lastError`, `requestId`, `jobId`.

### LlmProviderKey

`userId` + `provider` (groq|gemini|openrouter) unique; `ciphertext`, `iv`, `tag`, `last4` (AES-256-GCM).

### KbDocument

`orgId`, `userId`, `filename`, `bytes`, `pageEstimate`, `s3Key`, `status` processing|ready|failed, `chunkCount`, `error`, timestamps.

### Payment (billing)

`userId`, `orderId`, `paymentId`, `amount`, `credits`, `currency` INR, `plan`, `status` created|paid|failed.

### Conversation / Message (chat)

Conversation: `title` default `"New Chat"`, `userId`.  
Message: `conversationId`, `role` user|assistant, `content`, `images[]`, `artifacts[{ id, type, title, files[{ name, content }] }]`.

Filename typo on disk: `coversation.model.js`.

---

## 19. BYOK

- User stores Groq / Gemini / OpenRouter keys in Develop → Models.
- Encrypted at rest with `BYOK_ENCRYPTION_KEY` (AES-256-GCM) in `LlmProviderKey`.
- `byokEnabled` on User.
- `/v1/run` sets `x-billing-mode=byok` when enabled. Agent loads plaintext keys via Auth `/internal/byok-credentials`.
- BYOK **credit table is cheaper** (platform still takes a small fee; model $ goes to the customer’s provider).
- **Playground `/api/agent/chat` does not currently send `x-billing-mode`**, so UI BYOK likely applies only to the public API path.

Never log or commit customer provider keys.

---

## 20. Organizations

- First Develop visit auto-creates a personal workspace and backfills `orgId` on keys.
- Owner can set name + `allowedDomain`.
- Invite by email + role; join by `inviteCode` or matching email domain.
- Owner/admin manage keys; members can use the workspace.
- API spend on an org key bills the **org owner’s API wallet**.

This is **not** SAML / enterprise SSO.

---

## 21. Async jobs and webhooks

- `POST /v1/run` with `async: true` creates `ApiJob` `queued`, returns **202**.
- Gateway worker runs the same `executeRun`, updates job `succeeded` / `failed`.
- If the API key has `webhookUrl`, gateway enqueues `WebhookEvent`.
- Worker (`gateway/utils/webhookWorker.js`) every **15s**, HTTP timeout 5s, backoff 30s / 2m / 10m / 1h / 3h, max 5 attempts.
- Payload is the result body (plus `jobId` when async).

Develop → Activity lists recent jobs and usage.

---

## 22. Security model

| Rule | How |
|------|-----|
| Secrets never in git | `.gitignore` on `.env`, `*.pem`, Firebase JSON |
| Playground session | httpOnly cookie, Redis 7d, `COOKIE_SECURE` on HTTPS |
| API keys | Hash at rest; shown once; revoke/rotate |
| Prepaid only | A leaked key spends **the owner’s** credits, not an invoice |
| Internal mesh | `x-internal-token` |
| BYOK | AES-256-GCM; decrypt only in agent/auth memory |
| CORS | Single `FRONTEND_URL` |
| Uploads | 20 MB, PDF or image |
| Rate limits | Redis per user and per key |
| IP allowlist | Optional per key on `/v1` |
| Docs | Never render a live secret |

**Do not** put `sk_live_` in frontend env or in the tester committed to GitHub (tester is not in this repo).

Razorpay **test** keys were pasted in chat during local debug. Rotate them in the Razorpay dashboard when convenient; update server `.env` and frontend `VITE_RAZORPAY_KEY_ID` together.

---

## 23. Environment variables

Names only. Never commit values.

### Backend Compose / `backend/.env` on EC2

`NODE_ENV`, `COOKIE_SECURE`, `FRONTEND_URL`,  
`MONGODB_URI_AUTH`, `MONGODB_URI_CHAT`, `MONGODB_URI_AGENT`, `MONGODB_URI_BILLING`,  
`INTERNAL_SERVICE_SECRET`, `BYOK_ENCRYPTION_KEY`,  
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,  
`GROQ_API_KEY`, `GOOGLE_API_KEY`, `TAVILY_API_KEY`, `OPENROUTER_API_KEY`,  
`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_KEY`, `AWS_BUCKET_NAME`,  
`QDRANT_URL`, `QDRANT_API_KEY`,  
plus per-container `PORT`, `REDIS_URL`, `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE`.

Auth also mounts `backend/secrets/serviceAccountKey.json`.

### Frontend (laptop vs server)

| Name | Laptop | EC2 build |
|------|--------|-----------|
| `VITE_FIREBASE_API_KEY` | set | set |
| `VITE_RAZORPAY_KEY_ID` | set (key **id** only) | set |
| `VITE_SERVER_URL` | `http://localhost:8000` | **empty** |

Hardcoded in `firebase.js` (not secret-class, but identify the project): `authDomain` / `projectId` `cortex-474d1`.

### Tester

Optional `PORT` (default 5050). API base and key are typed in the UI, not env.

---

## 24. How to run locally

From the product repo (PowerShell: no `&&`; run as separate commands).

1. Redis: `docker compose -f backend/docker-compose.yml up` (or the Redis in oracle compose).
2. Start auth 8001, chat 8002, agent 8003, billing 8004, gateway 8000 (`npm run dev` in each service; each has its own `.env`).
3. Frontend: `cd frontend` → `npm run dev` (Vite, typically 5173) with `VITE_SERVER_URL=http://localhost:8000`.
4. Optional tester: `cd oneprompt-api-tester` → `npm start` → http://localhost:5050, base `http://localhost:8000`, paste an `sk_live_` from Develop.

Local auth: `COOKIE_SECURE=false`.

---

## 25. Production hosting (what is actually live)

**Live = one EC2.** Not ECS, not CloudFront, not Vercel. `.github/workflows/deploy.yml` is unused.

| Piece | Fact |
|-------|------|
| App dir | `/opt/oneprompt` |
| Frontend files | `/var/www/oneprompt/frontend` |
| Compose | `docker compose -f /opt/oneprompt/backend/docker-compose.oracle.yml` |
| nginx site | `/etc/nginx/sites-available/oneprompt` (Certbot HTTPS). **Do not overwrite with `deploy/nginx.conf`.** |
| Containers | `backend-gateway-1`, `auth`, `chat`, `agent`, `billing`, `redis` |
| HTTPS | Let’s Encrypt for `onepromptai.duckdns.org` |
| Backend flags | `NODE_ENV=production`, `COOKIE_SECURE=true`, `FRONTEND_URL=https://onepromptai.duckdns.org` |

### Redeploy (already done for `47ffb73`)

```bash
cd /opt/oneprompt
git pull origin main
# keep backend/.env; ensure INTERNAL_SERVICE_SECRET and BYOK_ENCRYPTION_KEY exist
cd backend
docker compose -f docker-compose.oracle.yml up -d --build
# edit live nginx 443 block only — add location /v1/ next to /api/
sudo nginx -t && sudo systemctl reload nginx
cd /opt/oneprompt/frontend
# .env: VITE_SERVER_URL= empty
npm ci && npm run build
sudo rm -rf /var/www/oneprompt/frontend/*
sudo cp -r dist/* /var/www/oneprompt/frontend/
```

`git pull` does **not** update the live site by itself.

Security group `launch-wizard-1`: 80 and 443 open; SSH 22 restricted to specific home IPs (a rule for `106.219.172.66/32` was added so this laptop could deploy).

---

## 26. API tester app

Path: `C:\Users\arpit\Downloads\1.cortexAI\oneprompt-api-tester`  
**Not** in the OnePrompt git repo.

- Express + multer, `npm start`, port **5050**
- UI: `public/index.html` — base URL, `sk_live_` key, agent, optional `kbSlug` (for `kb`), prompt, optional file, async checkbox
- `POST /proxy/run` → `{baseUrl}/v1/run` with Bearer
- `GET /proxy/job` → `{baseUrl}/v1/jobs/:jobId`
- Default base `http://localhost:8000`. For production, set base to `https://onepromptai.duckdns.org`

The tester is how “we called our application from another application.” The playground itself uses `/api/agent/chat`, not `/v1/run`.

---

## 27. How a request actually flows

### Playground chat

1. Signed-in user on `/app`
2. `ChatInput` builds FormData (`prompt`, `agent`, `conversationId`, optional `file`)
3. `POST https://onepromptai.duckdns.org/api/agent/chat` with cookie
4. nginx → gateway `protect` (cookie) → `x-user-id` + `x-internal-token` → agent
5. Agent saves user message, runs graph, deducts **playground** credits, saves assistant message
6. UI appends `answer` / images / artifacts

### Customer API (or tester)

1. Develop → Create key → copy `sk_live_…` once
2. Customer server (or tester proxy):

```http
POST /v1/run
Authorization: Bearer sk_live_…
Content-Type: application/json

{"prompt":"say hello","agent":"chat"}
```

3. nginx `/v1/` → gateway `protect` (Bearer) → resolve key → executeRun → agent `/chat` with `x-api-key-id` → deduct **API** credits
4. Sync JSON or 202 + poll `/v1/jobs/:jobId`

---

## 28. What is not implemented

Repeat of §3, for interview honesty: no streaming, no WebSockets, no GraphQL, no official SDK, no SAML, no conversation delete, no Google Drive sync, no automated tests, no ECS/CloudFront in production, no Gemini image generation, tester not hosted. Named knowledge bases, async ingest, quotas, PDF/DOCX/TXT/images, Gemini OCR for scans, and **per-document ACLs** **are** implemented (ACL+OCR may still be local-only until you push).

`React.lazy` / `useMemo` / `useCallback` are **not** a stated optimization of this project.

---

## 29. Known gaps and honest bugs

These are real. Do not hide them in an interview; explain tradeoffs.

1. **Playground BYOK** — gateway proxy to `/api/agent/chat` does not set `x-billing-mode`. BYOK is wired for `/v1/run`.
2. **Search → chat** can deduct twice.
3. **Chat ownership** — `get-messages`, `update-conversation`, `save-message` do not check the conversation belongs to `x-user-id`.
4. **Internal token** — if `INTERNAL_SERVICE_SECRET` is empty, internal routes are open.
5. **Qdrant collections** never deleted.
6. **Presigned URL expiry** mixed (seconds vs intended minutes/hours) vs UI copy.
7. **Redis `messages-*`** can lose TTL after `addMessage`.
8. **Multer filename** historically used `` `${Date.now}-${file.originalname}` `` (`Date.now` not called) in older code paths — verify if still present before claiming it is fixed.
9. **Payment verify** has no extra idempotency beyond Razorpay ids; replay could theoretically re-credit.
10. **Credits UI** can be stale until `/api/me` or re-login (billing drawer now refreshes after verify).
11. **Rate limit** has been returned as text with HTTP 200 in some agent paths.
12. **Agent Mongo** unused.
13. **`Home.jsx`** leftover CortexAI branding, unused.
14. **Idempotent error replay** returns stored body with **200**.
15. **Session after BYOK save** may omit `apiCredits` / `apiPlan` in the Redis write shape.

---

## 30. How to talk about this in an interview

**20 seconds**  
Full-stack multi-agent AI SaaS. React frontend, five Node services behind a gateway. LangGraph routes one prompt to eight agents. PDFs use RAG with Gemini embeddings and Qdrant. Redis does sessions, rate limits, and memory. Prepaid API keys for B2B. Deployed on one AWS EC2 with Docker and nginx.

**Why not ChatGPT?**  
ChatGPT is a model. This is orchestration, RAG, auth, dual-wallet billing, key management, storage, and a product you can host.

**Auto vs chips**  
Chips force an agent. Auto uses file MIME rules, then an LLM classifier.

**Playground vs API**  
Same agents. Cookie + playground credits vs Bearer + API credits. Customer apps must call `/v1/run` from a server.

**S3**  
Generated media only. The website is EC2 + nginx.

**Qdrant**  
Real vector DB for PDF chunks, not the user database, not “LangChain-only in memory.”

**Prepaid vs leaked keys**  
A leaked `sk_live_` can only spend remaining API credits. Revoke is instant. There is no postpaid invoice.

**What you would do next (if asked)**  
Streaming, conversation delete, Qdrant TTL, playground BYOK header, ownership checks on chat routes, tests, rotate any keys that appeared in chat.

---

## 31. Quantifiers (code-backed)

- 9 AI workflows / 9 LangGraph agent nodes + 1 router
- 5 Node microservices + Redis + nginx
- 4 public site routes (`/`, `/docs`, `/app`, `/develop`)
- 12 Mongoose models (User, ApiKey, ApiUsage, ApiJob, Organization, OrgMember, WebhookEvent, LlmProviderKey, KbDocument, Payment, Conversation, Message)
- 2 credit wallets (playground + API)
- 5 paid/free plan ids (`free`, `starter`, `pro`, `api_starter`, `api_pro`)
- 3 LLM vendors (Groq, Gemini, OpenRouter/DeepSeek) + Tavily + Pollinations
- Rate limit 5–20 req/min
- Redis session 7 days
- Chat memory last 20 messages
- RAG chunk 1000 / 200, top-5
- Upload cap 20 MB
- Webhook max 5 attempts
- 3 Redux slices
- Live host: 1 EC2, HTTPS DuckDNS

---

## Appendix A — Frontend dependency list

`@monaco-editor/react`, `@reduxjs/toolkit`, `@tailwindcss/vite`, `axios`, `firebase`, `lucide-react`, `motion`, `react`, `react-dom`, `react-icons`, `react-markdown`, `react-redux`, `react-router-dom`, `react-syntax-highlighter`, `remark-gfm`, `tailwindcss`, Vite 8.

## Appendix B — Agent service notable libraries

`@langchain/langgraph`, `@langchain/groq`, `@langchain/google-genai`, `@langchain/openrouter`, `@langchain/qdrant`, `@langchain/tavily`, `@langchain/textsplitters`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `pdfkit`, `pptxgenjs`, `pdf-parse`, `multer`, `mongoose`.

## Appendix C — Git

- Remote: `origin` → `https://github.com/Arpitrai073/OnePrompt.ai.git`
- Do not commit `.env`, pem files, or Firebase JSON
- Push does not deploy; EC2 pull + rebuild does

---

End of documentation.
