# OnePrompt.ai / CortexAI — Project Knowledge Base

**SUPERSEDED:** The complete, current document is [`DOCUMENTATION.md`](./DOCUMENTATION.md). This file was written before React Router, `/v1`, dual wallets, BYOK, orgs, Docs/Develop, and the public landing page. Do not trust endpoint counts, “no React Router”, or the old “12 REST endpoints / 4 collections” lists here. If this file and `DOCUMENTATION.md` disagree, trust `DOCUMENTATION.md`.

**Instructions for any AI reading this file:** Prefer `DOCUMENTATION.md`. Do not invent features. Do not claim GraphQL, WebSockets, or token streaming. Do not paste or assume real API keys.

- **Product name (resume/live):** OnePrompt.ai
- **Codebase folder name:** CortexAI (`1.cortexAI`)
- **GitHub:** https://github.com/Arpitrai073/OnePrompt.ai.git
- **Live URL:** https://onepromptai.duckdns.org
- **EC2 Elastic IP:** 13.205.112.137 (ap-south-1)
- **Firebase project id (frontend config):** cortex-474d1

---

## 1. Product summary

OnePrompt.ai is a **full-stack multi-agent AI SaaS**. The user types one prompt in a ChatGPT-style UI. A **LangGraph router** sends the request to a specialist agent. It is **not** a competitor to ChatGPT’s foundation model. It is an **application/product layer**: orchestration, RAG, auth, billing, storage, and deployment.

### User-facing capabilities (8 workflows)

| # | Workflow | Agent node | What it does |
|---|----------|------------|--------------|
| 1 | Chat | `chat` | General conversation with memory |
| 2 | Web search | `search` then `chat` | Tavily search, then chat synthesizes answer |
| 3 | Code generation | `coding` | Structured files + Monaco artifact preview |
| 4 | PDF generation | `pdf` | PDFKit → S3 signed URL |
| 5 | PPT generation | `ppt` | pptxgenjs → S3 signed URL |
| 6 | Image generation | `vision` | Groq rewrites prompt → Pollinations.ai → S3 |
| 7 | Image analysis | `imageAnalyzer` | Gemini 2.5 Flash multimodal on uploaded image |
| 8 | Document Q&A (RAG) | `pdfRag` | Chunk → embed → Qdrant → grounded answer |

Also: Google login, conversation sidebar, markdown replies, credit-based plans, PDF/image upload, Web Speech API mic input.

---

## 2. Tech stack

### Frontend
- React 19, Vite 8, Tailwind CSS 4
- Redux Toolkit (3 slices: `user`, `conversation`, `message`)
- Axios (`withCredentials: true`)
- Firebase Auth (Google popup)
- Monaco Editor (`@monaco-editor/react`)
- react-markdown
- Razorpay Checkout (`window.Razorpay`)
- motion / lucide-react
- **No React Router** — single page `Home.jsx`
- **No streaming, no WebSockets, no GraphQL**

### Backend
- Node.js + Express (ES modules)
- 5 microservices + Redis
- LangChain / LangGraph
- Mongoose + MongoDB Atlas
- ioredis
- Firebase Admin (`serviceAccountKey.json`, gitignored)
- Razorpay
- AWS S3 (`@aws-sdk/client-s3`, presigner)
- Qdrant via `@langchain/qdrant`
- Multer (disk `./temp`, max 20MB, PDF or `image/*`)
- PDFKit, pptxgenjs, pdf-parse, Tavily

### LLM / AI providers
| Provider | Used for | Env key |
|----------|----------|---------|
| Groq (`openai/gpt-oss-120b`) | chat, search synthesis, router, pdf/ppt planning, RAG **answer**, image **prompt rewrite** | `GROQ_API_KEY` |
| Google Gemini (`gemini-2.5-flash`) | **image analysis only** among chat models | `GOOGLE_API_KEY` |
| Gemini embeddings (`gemini-embedding-001`) | RAG vectors | `GOOGLE_API_KEY` |
| OpenRouter DeepSeek (`deepseek/deepseek-chat`) | coding agent | `OPENROUTER_API_KEY` |
| Tavily | web search | `TAVILY_API_KEY` |
| Pollinations.ai | **image generation HTTP, no API key** | none |
| Qdrant Cloud | vector store | `QDRANT_URL`, `QDRANT_API_KEY` (key is in env; `vectorDb.js` currently passes `url` + `collectionName` only) |

`getModel()` mapping (`llmModels.js`):
- `chat`, `search` → groq
- `coding` → openrouter
- `imageAnalyzer` → gemini
- **default** (router, pdf, ppt, vision prompt, pdf-rag, anything else) → groq

**Gemini is NOT used to generate images.** Image generation = Pollinations. Gemini = analysis + embeddings.

---

## 3. Architecture

```
Browser (React)
  → nginx on EC2 (static frontend + /api proxy)
    → API Gateway :8000
         /api/auth      → Auth :8001     (NO protect)
         /api/me        → Gateway        (protect)
         /api/chat      → Chat :8002     (protect + x-user-id)
         /api/agent     → Agent :8003    (protect + x-user-id)
         /api/billing   → Billing :8004  (protect + x-user-id)

Service-to-service HTTP:
  Agent   → Chat   save-message, get-messages
  Agent   → Auth   deduct-credits
  Billing → Auth   update-plan
```

**Gateway CORS:** `origin: FRONTEND_URL`, `credentials: true`.

**Auth model:** cookie `session` = UUID. Redis `session-{uuid}` holds user JSON. `protect` loads it. `proxyWithHeader` forwards `x-user-id`.

---

## 4. Folder structure (important paths)

```
backend/gateway/                 # API gateway
backend/services/auth/
backend/services/chat/
backend/services/agent/          # LangGraph + agents
backend/services/billing/
backend/shared/redis/redis.js
backend/docker-compose.yml       # local Redis only
backend/docker-compose.oracle.yml # production compose (used on EC2)
deploy/nginx.conf
deploy/ec2-setup.sh
.github/workflows/deploy.yml      # AWS ECR/ECS/S3/CloudFront pipeline (NOT used for live EC2 host)
frontend/src/pages/Home.jsx
frontend/src/components/
frontend/src/features/            # API wrappers
frontend/src/redux/
frontend/utils/axios.js
frontend/utils/firebase.js
```

---

## 5. REST API inventory (12 service endpoints + gateway extras)

### Auth (`:8001`, gateway prefix `/api/auth`)
- `POST /login` body `{ token }` Firebase ID token
- `GET /logout`
- `POST /update-plan` body `{ plan, credits, userId }` internal
- `POST /deduct-credits` body `{ userId, agent }` internal

### Chat (`:8002`, `/api/chat`)
- `GET /create-conversation` header `x-user-id`
- `GET /get-conversations`
- `POST /update-conversation` `{ id, title }`
- `POST /save-message` `{ conversationId, role, content, images, artifacts }`
- `GET /get-messages/:conversationId`

### Agent (`:8003`, `/api/agent`)
- `POST /chat` multipart: `prompt`, `conversationId`, `agent`, optional `file`

### Billing (`:8004`, `/api/billing`)
- `POST /create` `{ plan }`
- `POST /verify` `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`

### Gateway
- `GET /` `{ message: "hello from gateway v5" }`
- `GET /api/me` current session user

That is **12** downstream REST routes + `/` and `/api/me`.

---

## 6. MongoDB schemas (4 collections)

Databases are **service-isolated** (separate Atlas DB names: auth, chat, billing; agent URI exists but agent has **no Mongoose models** — connection unused).

### User (auth)
```
firebaseUid: String unique
name, email, avatar: String
plan: String default "free"
credits: Number default 100
totalCredits: Number default 100
planExpiresAt: Date
timestamps
```

### Conversation (chat)
```
title: String default "New Chat"
userId: String
timestamps
```

### Message (chat)
```
conversationId: ObjectId ref Conversation
role: "user" | "assistant"
content: String
images: [String]
artifacts: [{ id: Number, type: String, title: String, files: [{ name, content }] }]
timestamps
```

### Payment (billing)
```
userId: String required
orderId: String required
paymentId: String
amount: Number
currency: String default "INR"
credits: Number
plan: String
status: "created" | "paid" | "failed"
timestamps
```

Relations: User → Conversations (`userId`) → Messages (`conversationId`). User → Payments (`userId`).

---

## 7. Redis (not Mongo; three jobs)

| Key | Purpose | TTL |
|-----|---------|-----|
| `session-{uuid}` | Session payload | 7 days |
| `user-session-{userId}` | Maps user → current sessionId | 7 days |
| `rate:{userId}:{agent}` | Per-minute rate limit | 60s |
| `messages-{conversationId}` | Short chat memory | 24h on first cache fill; `addMessage` SET may not refresh EX |

Rate limits (`agentLimit.js`):
- chat: **20**/min
- coding, pdf, ppt, image, search: **5**/min
- unknown agent falls back to chat limit (20)

Memory (`memory.js`): keep last **20** messages.

---

## 8. Credits and billing

Deduct map (Auth `deductCredits`):
- chat: 1
- search: 5
- coding: 10
- pdf: 10
- ppt: 10
- vision: 10
- unknown agent: default 1

pdfRag deducts using agent key `"pdf"`. imageAnalyzer deducts `"vision"`.

Plans (`Plans.js`):
- free: ₹0, 100 credits, 30 days validity field
- starter: ₹199, 500 credits
- pro: ₹499, 1000 credits

Payment: Razorpay order amount = plan.amount * 100 (paise). Verify HMAC-SHA256 of `order_id|payment_id` with `RAZORPAY_KEY_SECRET`. Then Auth `update-plan` adds credits, sets plan, `planExpiresAt = now+30d`, refreshes Redis session.

**Known:** frontend may not refresh Redux credits after chat deduct or payment verify until `/api/me` or re-login. Search path can deduct search **and** chat.

---

## 9. LangGraph details

File: `backend/services/agent/graph/graph.js`

Nodes: router, chat, search, coding, pdf, ppt, vision, pdfRag, imageAnalyzer (**8 agent nodes** + router).

Edges:
- start → router
- router conditional → one of 8 agents
- **search → chat → end**
- all others → end

State fields: prompt, aiResponse, agent, conversationId, searchResults, images, artifacts, userId, file.

### Router (`graph/router.js`) — hybrid rule-based + LLM

1. If `state.agent` is set and **not** `"auto"` → use that agent (UI chip override).
2. Else if file mimetype `application/pdf` → `pdfRag`.
3. Else if file mimetype starts with `image/` → `imageAnalyzer`.
4. Else LLM classifies into: chat | search | coding | pdf | ppt | vision.

**UI chips** (`ChatInput.jsx`): default `selectedAgent = "Auto"`. FormData sends `agent` as lowercase label: `auto`, `chat`, `coding`, `pdf`, `ppt`, `vision`, `search`.

**Critical distinction:**
- Selecting **PDF chip** forces **PDF generation** (`pdf` agent), even if a PDF file is uploaded.
- **Auto + uploaded PDF** → **pdfRag** (Q&A), not generation.
- Selecting **Vision** = image **generation**, not analysis.
- **Auto + uploaded image** → **imageAnalyzer**.

Agent controller: save user message to Chat → `graph.invoke` → Redis addMessage → save assistant message → JSON `{ answer, images, artifacts }`. **No SSE/streaming.**

---

## 10. RAG (yes, implemented)

Only in `pdfRag.agent.js`. Qdrant is a **real vector DB** (Qdrant Cloud). LangChain is the client.

Pipeline:
1. Read uploaded file from disk
2. `pdf-parse` extract text
3. `RecursiveCharacterTextSplitter` **chunkSize 1000, chunkOverlap 200**
4. `QdrantVectorStore.fromDocuments` with Gemini embeddings
5. Collection name: `pdf-${Date.now()}` (**new collection per upload**)
6. `similaritySearch(prompt, 5)` top-5
7. LLM (Groq via default `getModel("pdf-rag")`) answers **only from context**; if missing: "I couldn't find this information in the uploaded PDF."
8. Temp file `unlink` in `finally`

**Stored in Qdrant:** chunk text + embedding vectors.  
**Not stored in Qdrant:** users, chats, original PDF bytes, payments, generated images.

---

## 11. Image generation vs analysis vs S3

**Generation (`vision.agent.js`):**
1. Groq (`getModel("image")` → default groq) rewrites cinematic prompt
2. `GET https://image.pollinations.ai/prompt/{encodedPrompt}` (no API key)
3. Upload PNG to **AWS S3**
4. Presigned GET URL (`getFromS3`, vision uses `24*60` seconds)
5. Deduct credits as `vision`

**Analysis (`imageAnalyzer.agent.js`):** Gemini 2.5 Flash, image as base64 `image_url`. Deduct `vision`. Rate limit key `"image"`.

**S3 is used** for generated PDFs, PPTs, and images.  
**S3 is NOT used** to host the React frontend (nginx on EC2 serves `dist/`).

---

## 12. Frontend structure

Components (9): SideBar, Nav, ChatArea, ChatInput, MessageList, MessageBubble, LoadingAnimation, Artifact, BillingDrawer.

Features/API: getCurrentUser, createConversation, getConversations, updateConversation, getMessages, sendMessage, logOut, createOrder, verifyPayment.

Axios production: `baseURL: import.meta.env.VITE_SERVER_URL || ""` so empty `VITE_SERVER_URL` = same-origin `/api` via nginx.

Artifact: Monaco editor + iframe `srcDoc` `sandbox="allow-scripts"` when `index.html` present.

Firebase config uses `VITE_FIREBASE_API_KEY` plus hardcoded authDomain/projectId/appId for cortex-474d1.

---

## 13. Auth flow

1. Google `signInWithPopup`
2. `getIdToken()` → `POST /api/auth/login`
3. Auth `verifyIdToken`, upsert User
4. Redis session 7 days, cookie httpOnly, sameSite strict, secure if `COOKIE_SECURE=true`
5. Later requests send cookie; Gateway protect

Logout deletes `session-{id}` and clears cookie. Auth service historically had fragile cookie parsing (no cookie-parser on auth); Gateway has cookie-parser.

---

## 14. Deployment (what is actually live)

**Live hosting = one AWS EC2**, not ECS, not CloudFront, not Vercel.

- Instance: Ubuntu 24.04, t3.small, 20GB gp3
- Docker Compose file: `backend/docker-compose.oracle.yml`
- Services: redis, auth, chat, agent, billing, gateway (gateway publishes 8000)
- nginx: SPA + `/api/` → `127.0.0.1:8000`
- DuckDNS: `onepromptai.duckdns.org`
- HTTPS: Let’s Encrypt (certbot)
- Frontend env on server: `VITE_SERVER_URL=` empty
- Backend: `FRONTEND_URL=https://onepromptai.duckdns.org`, `COOKIE_SECURE=true`
- Firebase Authorized domains must include `onepromptai.duckdns.org`
- Secrets were copied to the VM via SCP, **never committed to GitHub**
- GitHub was used as **source clone** on the server; extra local files (compose, nginx, cookie/axios fixes) were also uploaded because they were not all on `main` at clone time
- `.github/workflows/deploy.yml` targets ECR + ECS + S3 frontend + CloudFront — **designed but not used for the live site**

Local `docker-compose.yml` only runs Redis :6379.

---

## 15. Quantifiers (code-backed)

- 8 AI workflows / 8 LangGraph agent nodes
- 5 microservices
- 12 REST endpoints on services
- 3 LLM providers (Groq, Gemini, OpenRouter/DeepSeek) plus Tavily and Pollinations
- 4 MongoDB collections
- 3 pricing tiers
- Rate limit 5–20 req/min
- Redis session 7 days
- Chat memory last 20 messages
- RAG chunk 1000/200, top-5 retrieval
- 9 React components, 3 Redux slices
- 5 Dockerized backend services

---

## 16. What is NOT implemented (do not claim)

- Token streaming / SSE
- WebSockets / real-time push
- GraphQL
- React.lazy / code splitting / useMemo / useCallback as a stated optimization
- Conversation delete
- Reusable long-term RAG knowledge base (new Qdrant collection per upload)
- Automated tests
- ECS/CloudFront as the **running** production path
- Gemini image generation

---

## 17. Known gaps / bugs (honest)

- Multer filename used `` `${Date.now}-${file.originalname}` `` — `Date.now` not invoked
- `deductCredits` errors can be swallowed in agent util
- Search → chat can double-charge
- Rate limit often caught and returned as text with HTTP 200
- Credits UI can stay stale
- Agent MongoDB unused
- Qdrant API key may not be passed in vector store constructor
- Memory `addMessage` SET without EX
- Auth logout cookie-parser gap
- No conversation delete
- Presigned URL expiry vs UI copy may not match

---

## 18. How to explain the project (canonical)

**20 seconds:**  
Full-stack multi-agent AI SaaS. React frontend, 5 Node microservices behind a gateway. LangGraph routes one prompt to 8 agents. PDFs use RAG with Gemini embeddings and Qdrant. Redis does sessions, rate limits, and memory. Deployed on AWS EC2 with Docker and nginx.

**Why not ChatGPT:** ChatGPT is the model. This project is orchestration, RAG, auth, billing, storage, and a deployable product.

**Auto vs icons:** Icons override the agent. Auto uses file MIME rules then LLM classification.

**S3:** Used for generated media. Frontend is on EC2+nginx.

**Qdrant:** Real vector database for PDF chunk embeddings, not a library-only abstraction, not the user database.

---

## 19. Env vars (names only, no secrets)

Backend compose/production: `NODE_ENV`, `COOKIE_SECURE`, `MONGODB_URI_AUTH|CHAT|AGENT|BILLING`, `FRONTEND_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `TAVILY_API_KEY`, `OPENROUTER_API_KEY`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_KEY`, `AWS_BUCKET_NAME`, `QDRANT_URL`, `QDRANT_API_KEY`, plus internal `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE`, `REDIS_URL`, `PORT`.

Frontend: `VITE_FIREBASE_API_KEY`, `VITE_RAZORPAY_KEY_ID`, `VITE_SERVER_URL`.

Auth also needs `serviceAccountKey.json` mounted into the auth container.

---

## 20. Interview relevance (e.g. VedaAI)

This project demonstrates: full-stack React/Node, REST APIs, microservices, RAG, vector DB, embeddings, LLM orchestration, hybrid AI + rule-based routing, MongoDB, Redis caching/rate limiting, third-party AI APIs, Docker, AWS EC2. It does **not** demonstrate GraphQL, WebSockets, or SQL.

End of knowledge base.
