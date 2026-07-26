# ChaiBook LLM - Production-Grade RAG Backend

A high-performance, modular Node.js / TypeScript backend using **LangChain.js**, **Express**, **Qdrant Vector DB**, and **OpenAI**. 

It provides strict multi-tenant workspace isolation (`notebookId`), supports 5 ingestible source types (PDF, Web, YouTube, VTT/SRT, Text/Markdown), tracks source lifecycle statuses asynchronously, and streams grounded RAG responses token-by-token with structured citation payloads over Server-Sent Events (SSE).

---

## 🐳 Running with Docker Compose (Recommended for Loading & Production)

Run the full stack (Express Backend + Qdrant Vector DB + Redis Queue/Cache) in isolated containers with persistent storage:

```bash
cd backend

# 1. Ensure .env has your OPENAI_API_KEY set
cp .env.example .env

# 2. Launch all services in background
docker compose up -d --build

# 3. View container logs
docker compose logs -f

# 4. Stop all services
docker compose down
```

---

## 🏗️ Architecture & Strategy Design

- **`loaders/`**: Strategy Pattern for parsing document types (PDF, Web Cheerio, YouTube transcripts, VTT/SRT subtitles, and Text/Markdown character offsets).
- **`vectorstore/`**: Driver Abstraction layer for Vector DB operations using Qdrant with payload indexing on `notebook_id` & `source_id`. Includes in-memory fallback if Qdrant server is offline.
- **`services/`**: Orchestration logic separated into domain services (`SourceService`, `VectorService`, `RagService`, `StatusService`).
- **`routes/v1/` & `controllers/`**: Clean Express controllers serving versioned endpoints under `/api/v1/`.

---

## 🚀 Local Development Setup

```bash
cd backend
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

The server will start at `http://localhost:3001`.

---

## 🧪 Verification & Testing Guide (cURL Commands)

### 1. Ingest Web URL Source
```bash
curl -X POST http://localhost:3001/api/v1/notebooks/nb-tech-101/sources \
  -H "Content-Type: application/json" \
  -d '{
    "type": "webpage",
    "url": "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "title": "Artificial Intelligence Overview"
  }'
```

### 2. Ingest YouTube Video Source
```bash
curl -X POST http://localhost:3001/api/v1/notebooks/nb-tech-101/sources \
  -H "Content-Type: application/json" \
  -d '{
    "type": "youtube",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Rick Astley Video"
  }'
```

### 3. Ingest PDF / Subtitle File (Multipart Upload)
```bash
curl -X POST http://localhost:3001/api/v1/notebooks/nb-tech-101/sources \
  -F "file=@/path/to/document.pdf" \
  -F "type=pdf" \
  -F "title=Machine Learning Handbook"
```

### 4. Poll Ingestion Status
```bash
curl http://localhost:3001/api/v1/sources/YOUR_SOURCE_ID/status
```

### 5. Grounded RAG Chat Streaming (SSE)
```bash
curl -N -X POST http://localhost:3001/api/v1/notebooks/nb-tech-101/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the primary subfields of artificial intelligence?"
  }'
```

### 6. Delete a Source (Vectors & Metadata Cleanup)
```bash
curl -X DELETE http://localhost:3001/api/v1/sources/YOUR_SOURCE_ID
```
