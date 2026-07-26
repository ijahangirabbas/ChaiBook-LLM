# ☕ ChaiBook LLM — Production-Ready AI Notebook & RAG Platform

**ChaiBook LLM** is a full-stack, multi-tenant Retrieval-Augmented Generation (RAG) platform that allows users to upload documents (PDFs, text, subtitles), index web pages and YouTube transcripts, organize knowledge into isolated topic notebooks, and stream grounded AI responses backed by verified source citations.

---

## 🌟 Architecture & Key Highlights

- **Frontend**: React 18, TypeScript, TailwindCSS, Framer Motion, Zustand (with state persistence), and Lucide Icons built using Vite.
- **Backend API**: Express.js REST API with LangChain.js, TypeScript, and Server-Sent Events (SSE) token streaming.
- **Database & Persistence**: PostgreSQL managed via **Prisma ORM** (`User`, `Workspace`, `Membership`, `Notebook`, `Source`, `Conversation`, `Message`, `Generation`, `MessageCitation`, `IngestionJob`).
- **Vector Database**: **Qdrant Vector Database** with `workspace_id` and `notebook_id` payload filters for tenant isolation.
- **Authentication**: **Supabase Auth** (OAuth with Google & GitHub) with cryptographic JWT verification on Express API routes.
- **Resilient UI & State Hydration**: Skeletons for async loads, retry error banners, persistent localStorage state across page refreshes, and graceful 404 page handling.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend Framework** | React 18, Vite, TypeScript |
| **Styling & Motion** | TailwindCSS, Framer Motion |
| **State Management** | Zustand (with `persist` middleware) |
| **Backend Framework** | Node.js, Express.js, TypeScript |
| **AI Framework** | LangChain.js (`@langchain/openai`, `@langchain/core`) |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Vector Search** | Qdrant (`@qdrant/js-client-rest`) |
| **Authentication** | Supabase Auth (`@supabase/supabase-js`, `jsonwebtoken`) |
| **Ingestion Loaders** | PDF (`pdf-parse`), Web (`cheerio`), YouTube (`youtube-transcript`), Subtitles (`srt`/`vtt`) |

---

## 🔐 Multi-Tenant Security & Tenant Isolation

1. **Cryptographic JWT Verification**: Express middleware (`auth.middleware.ts`) verifies incoming Supabase JWT tokens (`sub` claim) and auto-provisions user & workspace context on the request object (`req.user = { id, email, workspaceId }`).
2. **Workspace-Scoped Database Queries**: All Prisma repository operations on `Notebooks`, `Sources`, and `Conversations` enforce strict filtering by `workspaceId`.
3. **Qdrant Filter Enforcement**: Vector similarity search applies compound filters (`metadata.workspace_id` AND `metadata.notebook_id`) to ensure cross-tenant data leakage is cryptographically impossible.
4. **Auto-Upsert Safety**: Ingestion status initialization automatically verifies that the parent `Workspace` and `Notebook` exist in PostgreSQL before inserting `Source` entries, eliminating foreign key constraint failures.

---

## 🗄️ Database Model Overview (`schema.prisma`)

- `User`: Stores user identity, email, avatar, and Supabase subject (`supabaseSubject`).
- `Workspace`: Tenant container owning notebooks, sources, and conversations.
- `Membership`: Maps users to workspaces with roles (`OWNER`, `MEMBER`).
- `Notebook`: Topic workspace owning sources and chat conversations (`workspaceId`, `userId`, `deletedAt`).
- `Source`: Ingested file, URL, or pasted text (`workspaceId`, `notebookId`, `status`, `indexingProgress`, `errorMessage`).
- `Conversation`: Thread of user and assistant messages for a notebook.
- `Message`: Chat message (`USER` or `ASSISTANT`) with inline JSON sources and linked `MessageCitation` records.
- `Generation`: Audit log recording token consumption (`promptTokens`, `completionTokens`) and generation latency (`latencyMs`).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Running PostgreSQL server (or Supabase Postgres)
- **Qdrant**: Local Qdrant instance (`http://localhost:6333`) or Qdrant Cloud
- **OpenAI API Key**: Valid key for embeddings (`text-embedding-3-small`) and chat (`gpt-4o`)

---

### Environment Setup

#### 1. Backend Environment (`backend/.env`)

Create a `backend/.env` file:

```env
PORT=3001
NODE_ENV=development

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chaibook_db?schema=public"

OPENAI_API_KEY="your-openai-api-key"
QDRANT_URL="http://localhost:6333"
QDRANT_COLLECTION_NAME="chaibook_sources"

SUPABASE_JWT_SECRET="your-supabase-jwt-secret"
CORS_ORIGINS="http://localhost:5173"
```

#### 2. Frontend Environment (`frontend/.env`)

Create a `frontend/.env` file:

```env
VITE_API_URL="http://localhost:3001/api/v1"
VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

---

### Installation & Launch

#### Step 1: Install Dependencies & Run Database Migrations

```bash
# Setup Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Setup Frontend
cd ../frontend
npm install
```

#### Step 2: Start the Backend Server

```bash
cd backend
npm run dev
```

The Express API will run on `http://localhost:3001`. You can test health at `http://localhost:3001/health`.

#### Step 3: Start the Frontend Application

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📡 API Reference Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Server & Redis health check status |
| `GET` | `/api/v1/notebooks` | List workspace-scoped notebooks |
| `POST` | `/api/v1/notebooks` | Create a new notebook |
| `GET` | `/api/v1/notebooks/:id` | Fetch notebook by ID with its sources |
| `PATCH` | `/api/v1/notebooks/:id` | Update notebook title, description, icon, or color |
| `DELETE` | `/api/v1/notebooks/:id` | Soft-delete notebook |
| `POST` | `/api/v1/notebooks/:notebookId/sources` | Ingest file upload, URL, or pasted text into notebook |
| `GET` | `/api/v1/sources/:sourceId/status` | Poll source indexing status & progress percentage |
| `DELETE` | `/api/v1/sources/:sourceId` | Delete source & purge vectors from Qdrant |
| `POST` | `/api/v1/notebooks/:notebookId/chat` | SSE stream grounded RAG tokens, citations, and message status |

---

## 🧪 Testing & Linting

```bash
# Run Frontend Linter (Oxlint)
cd frontend
npm run lint

# Build Frontend Bundle
npm run build

# Build Backend TypeScript
cd ../backend
npm run build
```
