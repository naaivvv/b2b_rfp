# AGENTS.md — RFP Response Architect

> This file is read automatically by Codex at the start of every session.
> It provides full project context, architectural decisions, and development conventions.
> **Never delete or rename this file.**

---

## Project Overview

**Name:** Autonomous B2B RFP Response Architect  
**Goal:** An agentic pipeline that ingests RFP PDFs, retrieves relevant internal company knowledge via RAG, and autonomously drafts compliant proposal documents — with a human-in-the-loop review dashboard.

**End State:** A production-grade, full-stack application where:
1. A user uploads an RFP PDF via a Next.js dashboard
2. n8n detects the upload and triggers the AI pipeline
3. CrewAI agents (Analyst → Retriever → Writer) process the RFP
4. A draft proposal is stored in Supabase and surfaced in the dashboard
5. A human reviews, edits, and exports the final document

---

## Tech Stack (Locked — Do Not Deviate Without Explicit Instruction)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Backend DB | Supabase (PostgreSQL + pgvector extension) |
| Automation | n8n (self-hosted via Docker or n8n Cloud) |
| AI Agents | CrewAI (Python) |
| Agent API | FastAPI (Python) |
| Embeddings | HuggingFace `BAAI/bge-small-en-v1.5` (local via sentence-transformers) |
| LLM | OpenRouter `auto` (via CrewAI `LLM`) |
| PDF Parsing | pdfplumber (Python) |
| Rich Text Editor | TipTap |
| Export | jsPDF or docx npm package |

---

## Repository Structure

```
/
├── AGENTS.md                  ← You are here. Project context for Codex.
├── PROJECT.md                 ← Original project specification
├── PROMPTS.md                 ← Phase-by-phase kickoff prompts
│
├── frontend/                  ← Next.js application
│   ├── app/
│   │   ├── upload/            ← Upload RFP page
│   │   ├── proposals/         ← Review dashboard
│   │   └── proposals/[id]/    ← Individual proposal review + editor
│   ├── components/
│   ├── lib/
│   │   └── supabase.ts        ← Supabase client
│   └── types/
│
├── agents/                    ← Python CrewAI + FastAPI service
│   ├── main.py                ← FastAPI entrypoint
│   ├── crew.py                ← CrewAI crew definition
│   ├── agents/
│   │   ├── analyst.py
│   │   ├── retriever.py
│   │   └── writer.py
│   ├── tools/
│   │   └── vector_search.py   ← Supabase pgvector query tool
│   ├── ingestion/
│   │   ├── parse_pdf.py
│   │   ├── chunk.py
│   │   └── embed_and_upsert.py
│   └── requirements.txt
│
├── n8n/
│   └── rfp_workflow.json      ← Exported n8n workflow
│
└── docker-compose.yml         ← Runs n8n + agents service locally
```

---

## Database Schema (Supabase)

### Table: `rfp_documents`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| created_at | timestamptz | |
| file_name | text | Original PDF file name |
| storage_path | text | Supabase Storage path |
| status | text | `uploaded` → `processing` → `draft_ready` → `approved` |
| extracted_requirements | jsonb | Output of Analyst Agent |

### Table: `proposals`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| rfp_id | uuid (FK → rfp_documents) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| draft_markdown | text | Raw Writer Agent output |
| edited_content | text | Human-edited version |
| version | integer | Increments on each save |

### Table: `knowledge_chunks`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| content | text | Raw chunk text |
| embedding | vector(384) | pgvector column |
| source_doc | text | Origin file name |
| category | text | e.g. `technical`, `legal`, `past_rfp` |
| created_at | timestamptz | |

---

## Agent Definitions

### 1. Requirements Analyst Agent
- **Input:** Raw text extracted from the uploaded RFP PDF
- **Task:** Identify and extract hard constraints — deadlines, compliance requirements, technical prerequisites, evaluation criteria
- **Output:** Structured JSON object `{ deadline, compliance: [], technical_requirements: [], evaluation_criteria: [] }`

### 2. Technical Retrieval Agent
- **Input:** JSON output from the Analyst Agent
- **Task:** Query `knowledge_chunks` via pgvector similarity search using each requirement as a query
- **Output:** A curated context bundle — top-k relevant chunks per requirement

### 3. Proposal Writer Agent
- **Input:** Original RFP text + context bundle from Retrieval Agent
- **Task:** Draft a professional, section-by-section proposal that directly addresses each requirement
- **Output:** Formatted Markdown document

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
N8N_WEBHOOK_URL=
```

### Agents (`agents/.env`)
```
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Development Conventions

- **TypeScript:** Strict mode on. No `any` types.
- **Components:** Functional components only. Use `shadcn/ui` for UI primitives.
- **API routes:** All Next.js API routes live in `app/api/`. Use route handlers (not pages/api).
- **Python:** Use `async` FastAPI endpoints. Type-hint all functions with Pydantic models.
- **Error handling:** Every agent task must have a `try/except` block. Errors update the RFP `status` to `error` in Supabase.
- **Commits:** One phase = one working feature branch. Merge to `main` only when a phase is complete.

---

## Current Phase Tracker

Update this section manually as phases are completed.

- [ ] **Phase 1** — Architecture & Infrastructure Setup
  - [ ] 1.1 Next.js app bootstrapped
  - [ ] 1.2 Supabase configured + pgvector enabled + schema applied
  - [ ] 1.3 n8n instance running
- [ ] **Phase 2** — RAG Knowledge Base Pipeline
  - [ ] 2.1 PDF parsing script
  - [ ] 2.2 Chunking + embedding
  - [ ] 2.3 Vector upsert to Supabase
- [ ] **Phase 3** — CrewAI Agentic Core
  - [ ] 3.1 Analyst Agent
  - [ ] 3.2 Retrieval Agent
  - [ ] 3.3 Writer Agent
  - [ ] 3.4 FastAPI wrapper
- [ ] **Phase 4** — n8n Workflow Automation
  - [ ] 4.1 Webhook trigger
  - [ ] 4.2 Orchestration flow
  - [ ] 4.3 Supabase status sync
- [ ] **Phase 5** — Human-in-the-Loop Dashboard
  - [ ] 5.1 Real-time subscriptions
  - [ ] 5.2 Side-by-side review UI
  - [ ] 5.3 Export to PDF/DOCX

---

## Key Constraints & Gotchas

1. **pgvector dimension must match embedding model.** `BAAI/bge-small-en-v1.5` = 384 dimensions. If you switch models, you must drop and recreate the `knowledge_chunks` table.
2. **n8n webhook must be publicly accessible** to receive events from Next.js in production. Use ngrok for local dev.
3. **Supabase Storage** is used for the raw PDF files. The `rfp_documents.storage_path` column points to the storage object key, not a public URL.
4. **CrewAI sequential process** — agents run in strict order. Do not attempt parallel execution until Phase 3 is stable.
5. **TipTap** requires the `@tiptap/react` and `@tiptap/starter-kit` packages. Initialize with the Markdown-parsed content from the `proposals` table.
