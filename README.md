# ☕ ChaiBook LLM — Multi-Tenant RAG & AI Notebook Platform

**ChaiBook LLM** is an enterprise-grade, multi-tenant Retrieval-Augmented Generation (RAG) platform and interactive research notebook. It empowers users to upload documents (PDFs, plain text, Markdown), extract web pages and YouTube transcripts/subtitles, organize knowledge into isolated topic notebooks, and receive grounded AI answers supported by verifiable inline citations and source snippets.

---

## 📌 Project Status

![Status](https://img.shields.io/badge/Status-Beta%20%2F%20Active%20Development-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Architecture-Decoupled%20API%20%26%20Worker-orange?style=for-the-badge)

- **Current Release**: `v1.0.0-beta` (Production-Hardened core pipelines, Clerk multi-tenancy, durable BullMQ queues, Jina/OpenAI vector pipelines).
- **Development Lifecycle**: Active Development. Core ingestion and streaming RAG paths are fully functional, verified with automated API suites, and running asynchronously via worker processes.

---

## 🖥️ System Requirements

| Software | Required Version | Purpose |
| --- | --- | --- |
| **Node.js** | `>= v18.0.0` (v20+ recommended) | Backend Express API & BullMQ worker runtime |
| **npm** | `>= v9.0.0` | Package management |
| **PostgreSQL** | `>= 14.0` | Core database (Neon, AWS RDS, or self-hosted) |
| **Qdrant Vector DB**| `>= v1.8.0` | Vector storage & similarity search engine |
| **Redis** | `>= v6.2.0` | BullMQ queue management & response caching |
| **AWS S3 / Compatible**| Any S3-compatible | Object storage for uploaded source files |

---

## ⚙️ Configuration Guide

Configuration is managed via environment variables validated at startup by Zod.

### Key Environment Variables

```env
# Server & Process Role
PORT=3001
NODE_ENV=development
PROCESS_ROLE=all                    # Options: 'all' (API + Worker), 'api', 'worker'
LOG_LEVEL=info                     # Options: fatal, error, warn, info, debug, trace

# Database & Cache
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chaibook_db?schema=public"
REDIS_URL="redis://localhost:6379"

# Authentication (Clerk)
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."

# AI Model Configuration
CHAT_MODEL="llama-3.3-70b-versatile" # LLM model for completion (Groq/OpenAI)
OPENAI_API_KEY="sk-..."             # OpenAI or Groq API Key
GROQ_API_KEY=""                     # Optional Groq API Key override
JINA_API_KEY="jina_..."             # Jina AI key for embeddings & reranking

# Vector Database (Qdrant)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""
QDRANT_COLLECTION_NAME="chaibook_sources"
QDRANT_VECTOR_SIZE=1024             # 1024 for Jina, 1536 for OpenAI

# Text Splitting & Quota Controls
WORKSPACE_DAILY_TOKEN_BUDGET=200000
WORKSPACE_INGESTION_CONCURRENCY=2
MIN_SIMILARITY_SCORE=0.35

# Object Storage
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="chaibook-sources"
```

### Feature Flags & Ingestion Parameters
- **Chunk Size**: `500` characters with `50` character overlap (`RecursiveCharacterTextSplitter`). Sub-segment caption chunking splits transcript timelines into 5-entry batches.
- **Process Isolation**: Configure `PROCESS_ROLE=api` for stateless REST API servers and `PROCESS_ROLE=worker` for background processing nodes.

---

## 🤖 AI Models Used

ChaiBook LLM features a modular AI provider interface:

| Pipeline Stage | Model / Provider | Primary Selection | Fallback / Alternative | Dimensions / Context |
| --- | --- | --- | --- | --- |
| **Chat Completion** | Groq / OpenAI | `llama-3.3-70b-versatile` | `gpt-4o`, `gpt-3.5-turbo` | 128k context window |
| **Embeddings** | Jina AI / OpenAI | `jina-embeddings-v5-text-small` | `text-embedding-3-small` | 1024 dims (Jina) / 1536 dims (OpenAI) |
| **Reranker** | Jina AI Cross-Encoder | `jina-reranker-v2-base-multilingual` | Hybrid BM25 keyword overlap + MMR ($\lambda=0.7$) | Top 20 candidates $\rightarrow$ Top 5 reranked |

---

## 🗄️ Vector Database Configuration

ChaiBook LLM leverages **Qdrant** as its primary vector store with native payload indexing for tenant isolation.

- **Collection Name**: Configured via `QDRANT_COLLECTION_NAME` (default: `chaibook_sources`).
- **Distance Metric**: `Cosine` similarity.
- **Dimension Matching**: Automatically validated on boot (1024 for Jina, 1536 for OpenAI).
- **Payload Indexing**: The following fields are indexed with `keyword` schema for high-performance multi-tenant filtering:
  - `metadata.workspace_id` & `workspace_id`
  - `metadata.notebook_id` & `notebook_id`
  - `metadata.source_id` & `source_id`

---

## 🎯 Prompt Engineering Overview

RAG generations use strict system prompts:

### Core Prompt Principles
1. **Factual Grounding**: Answers must rely strictly on context provided inside `<context>` blocks.
2. **Mandatory Inline Citations**: Every claim or fact derived from a source must feature an inline bracketed citation, e.g. `[1]`, `[2]`.
3. **Context Security Isolation**: All context text is wrapped inside `<source id="X" chunk_id="Y" trusted="false">` tags to prevent prompt-injection attacks.
4. **Structured Markdown Output**: Responses use bullet points, bold key terms, and code blocks for visual clarity.

---

## 📊 Data Flow Diagram

```mermaid
flowchart TD
    User([User / Browser]) <-->|HTTPS / REST / SSE| FE[React 18 Frontend]
    FE <-->|JWT Bearer Tokens| API[Express API Server]
    
    API -->|Authenticate Token| Clerk[Clerk Auth Provider]
    API <-->|Metadata & Relational Data| PG[(PostgreSQL Database)]
    API -->|File Uploads| S3[(AWS S3 Quarantine)]
    API -->|Enqueue Ingestion Job| Redis[(Redis Queue / BullMQ)]
    
    Worker[BullMQ Ingestion Worker] <-->|Pop Queue Jobs| Redis
    Worker -->|Read Raw File| S3
    Worker -->|1. Extract Text| Loaders[Document Loaders]
    Worker -->|2. Split Chunks| Splitter[Recursive Character Text Splitter]
    Worker -->|3. Embed Chunks| Embedder[Jina / OpenAI Embedding API]
    Worker -->|4. Upsert Vectors| Qdrant[(Qdrant Vector DB)]
    Worker -->|5. Update Status| PG
    
    API <-->|Similarity Search + Rerank| Qdrant
    API -->|Rerank Candidates| Reranker[Jina Cross-Encoder Reranker]
    API -->|Stream Tokens & Citations| LLM[Groq / OpenAI LLM API]
    LLM -->|SSE Stream| FE
```

---

## 🔄 Sequence Diagram: Upload → Index → Retrieve → Answer

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React Frontend
    participant API as Express API
    participant DB as PostgreSQL (Prisma)
    participant S3 as AWS S3 Storage
    participant Queue as Redis / BullMQ
    participant Worker as Ingestion Worker
    participant Qdrant as Qdrant Vector DB
    participant LLM as Groq / OpenAI LLM

    %% Upload & Ingestion Phase
    rect rgb(240, 248, 255)
    note right of User: Stage 1: Upload & Ingestion Enqueue
    User->>FE: Upload File / Submit URL
    FE->>API: POST /api/v1/notebooks/:id/sources
    API->>S3: Upload raw document
    API->>DB: Create Source (status: UPLOADING)
    API->>Queue: Enqueue ingestion job
    API-->>FE: Return Source ID (status: QUEUED)
    end

    rect rgb(245, 245, 245)
    note right of Worker: Stage 2: Asynchronous Indexing
    Queue->>Worker: Consume Ingestion Job
    Worker->>DB: Update status to INDEXING (progress: 25%)
    Worker->>S3: Fetch raw document
    Worker->>Worker: Extract text & split chunks (chunkSize: 500)
    Worker->>Qdrant: Generate embeddings & upsert vectors
    Worker->>DB: Save chunks & set status READY (progress: 100%)
    end

    %% Query & RAG Phase
    rect rgb(255, 250, 240)
    note right of User: Stage 3: Retrieval & Grounded Answer Stream
    User->>FE: Ask question in notebook chat
    FE->>API: POST /api/v1/notebooks/:id/chat (SSE)
    API->>Qdrant: Similarity Search (top 20 candidates, tenant filtered)
    Qdrant-->>API: Candidate chunks & metadata
    API->>API: Jina Cross-Encoder Rerank + MMR (top 5 final)
    API->>LLM: Stream prompt with context & system rules
    loop SSE Stream
        LLM-->>API: Token chunks
        API-->>FE: sendSSEEvent('token.delta')
    end
    API-->>FE: sendSSEEvent('citations', sources)
    API->>DB: Persist Message, Generation Stats, and Citations
    API-->>FE: sendSSEEvent('completed')
    end
```

---

## 🛠️ Troubleshooting Guide

### 1. Qdrant Vector Size Mismatch
* **Symptom**: `Vector dimension mismatch in Qdrant collection (expected 1024, found 1536)`.
* **Fix**: Ensure your `EMBEDDING_MODEL` or `JINA_API_KEY` setting matches `QDRANT_VECTOR_SIZE`. If switching from OpenAI (1536) to Jina (1024), restart the backend process to auto-recreate the collection, or manually drop the Qdrant collection via `curl -X DELETE http://localhost:6333/collections/chaibook_sources`.

### 2. BullMQ Redis Connection Errors
* **Symptom**: `Failed to start BullMQ ingestion worker — is Redis available?`.
* **Fix**: Verify Redis is running locally (`redis-cli ping`) or inspect your `REDIS_URL` in environment configuration.

### 3. Authentication Failures (401 Unauthorized)
* **Symptom**: API calls return `401 Unauthorized: Invalid or missing authentication token`.
* **Fix**: Verify `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` are configured. Ensure the frontend client passes the authorization header `Bearer <token>`.

### 4. SSE Stream Disconnections
* **Symptom**: Chat streams stop abruptly or omit citations.
* **Fix**: ChaiBook LLM supports automatic client reconnection via standard `Last-Event-ID` tracking. Check server logs to ensure `OPENAI_API_KEY` or `GROQ_API_KEY` rate limits are not being exceeded.

---

## 📖 Glossary

- **RAG (Retrieval-Augmented Generation)**: A technique that enhances LLM generation by retrieving relevant facts from an external vector store before generating a response.
- **Embeddings**: High-dimensional vector representations of text snippets that capture semantic meaning.
- **Chunks**: Small, cohesive blocks of text (500 characters) created by breaking down large documents for search.
- **Citations**: Verifiable source reference markers (`[1]`, `[2]`) attached to AI statements linked directly to original document snippets and page numbers.
- **Reranking**: Secondary relevance scoring of vector search candidates using a deep cross-encoder model to maximize accuracy.
- **MMR (Maximal Marginal Relevance)**: An algorithm that balances query relevance with result diversity to eliminate duplicate document chunks.
- **Tenant Isolation**: Technical boundaries preventing users in one workspace from accessing or searching another workspace's vectors or documents.

---

## 🔄 Version Compatibility Matrix

| Dependency | System Version | Package Version | Compatibility Notes |
| --- | --- | --- | --- |
| **Node.js** | `>= 18.0.0` | N/A | Tested on Node v18.20 and v20.14 |
| **TypeScript** | `>= 5.0.0` | `^5.5.2` (backend), `~6.0.2` (frontend) | Strict ESM and CJS transpilation |
| **PostgreSQL** | `>= 14.0` | `@prisma/client ^5.16.1` | Managed via Prisma ORM |
| **Qdrant Client**| `>= 1.8.0` | `@qdrant/js-client-rest ^1.11.0` | Rest client API |
| **LangChain.js**| N/A | `@langchain/core ^0.3.0` | Uses modular `@langchain/*` split packages |
| **React** | N/A | `^19.2.7` | Built using Vite 8 |
| **TailwindCSS** | N/A | `^3.4.19` & `@tailwindcss/vite ^4.3.3` | Tailwind v3/v4 hybrid setup |

---

## ⚡ Benchmarks

| Metric | Measured Benchmark | Conditions / Setup |
| --- | --- | --- |
| **Indexing Speed** | `~120 - 250 chunks/sec` | Jina Embeddings API, batched Qdrant upsert (100 points/batch) |
| **Vector Search Latency** | `15 - 35 ms` | Qdrant Cosine search with `workspace_id` payload index |
| **Jina Rerank Latency** | `120 - 220 ms` | Top 20 candidates $\rightarrow$ Top 5 cross-encoder rerank |
| **Time to First Token (TTFT)** | `350 - 650 ms` | SSE Chat stream powered by Groq (`llama-3.3-70b-versatile`) |
| **Average Token Budget** | `600 - 1,200 tokens/query` | Includes System Prompt + 5 Retained Source Chunks |

---

## 🔒 Security & Privacy

1. **Strict Multi-Tenant Isolation**: Data access is isolated at three independent layers:
   - **Authentication**: Clerk JWTs cryptographically verified on Express routes.
   - **Database**: All Prisma queries require `workspaceId` equality.
   - **Vector Database**: Qdrant queries enforce payload filters (`metadata.workspace_id` AND `metadata.notebook_id`).
2. **Data Retention & Soft Deletion**: User documents and notebooks use soft-delete timestamps (`deletedAt`). Vector purges explicitly scrub Qdrant points when sources are deleted.
3. **Secret Protection**: Pino loggers automatically redact sensitive fields (`Authorization`, `OPENAI_API_KEY`, connection strings).
4. **Prompt Injection Defense**: Document contents are isolated inside `<source trusted="false">` boundaries to prevent malicious prompt overrides.

---

## 🚀 Release Notes & Future Enhancements

### Release Notes (v1.0.0-beta)
- ✅ **Decoupled Worker**: Distributed BullMQ ingestion worker process (`PROCESS_ROLE=worker`).
- ✅ **Jina V5 & V2 Reranker**: Integrated Jina embeddings and cross-encoder reranking.
- ✅ **SSE Streaming**: Production-grade SSE token streaming with citation attachments and automatic client reconnection.
- ✅ **Redis Caching**: Workspace-level Redis caching for notebook listings.

### Roadmap & Future Enhancements
- [ ] **Hybrid Search**: Integrate dense vector retrieval with Qdrant native BM25 sparse keyword search.
- [ ] **Document Canvas & OCR**: In-browser PDF renderer with highlighted bounding boxes for citations and OCR for scanned documents.
- [ ] **Agentic Tools**: Autonomous web search and calculator tools for complex multi-step research.
- [ ] **Granular RBAC**: Fine-grained workspace roles (`VIEWER`, `EDITOR`, `ADMIN`).

---

<p center="align">
  <i>Built with ❤️ by Jahangir Abbas Munnan</i>
</p>
