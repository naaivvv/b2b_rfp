# PROMPTS.md — Phase-by-Phase Codex Kickoff Prompts

> Copy-paste each prompt block into Codex at the start of each task.
> Every prompt begins with a MODE line — follow it before pasting the rest.

## Mode Legend
> ⚡ DIRECT EXECUTE — paste the prompt and let Codex run. All new files, nothing to break.
> 🗺️ PLAN FIRST — type `/plan` in Codex, then paste the prompt. Review before approving execution.

---

## PHASE 1 — Architecture & Infrastructure Setup

### 1A — Bootstrap Frontend + Docker  `⚡ DIRECT EXECUTE`

> Why direct: creates only new files (Next.js scaffold, docker-compose). Nothing existing to break.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

We are starting Phase 1. Complete the following tasks in order. These are all new file
creations — do not modify any existing files.

TASK 1.1 — Bootstrap the Next.js Frontend
- Scaffold a Next.js 14 app inside a /frontend directory using TypeScript and Tailwind CSS (App Router)
- Install and configure shadcn/ui
- Create two placeholder routes:
    - /upload → a page titled "Upload RFP" with a file input that accepts only PDFs and a submit button
    - /proposals → a page titled "Proposals Dashboard" with an empty state message "No proposals yet"
- Create /frontend/lib/supabase.ts exporting both a browser client and a server client using @supabase/ssr
- Create /frontend/.env.local with the required env variable keys (values left blank, with comments describing each)

TASK 1.3 — Docker Compose for Local Dev
- Create a docker-compose.yml in the root that runs:
    - n8n on port 5678 with a named volume for persistence
    - A placeholder for the Python agents service (image: python:3.11-slim, command: sleep infinity) on port 8000
- Add a README.md section explaining how to start the local environment with: docker compose up -d

When done, list all files created and confirm no existing files were modified.
```

---

### 1B — Supabase Schema  `🗺️ PLAN FIRST`

> Why plan-first: SQL schema is hard to undo. The pgvector index and RPC function have exact
> constraints that must be reviewed before execution.
>
> **Before pasting:** type `/plan` in Codex, paste this prompt, review the proposed SQL and
> table definitions, then approve.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

TASK 1.2 — Supabase Schema

Before writing any SQL, show me your plan:
- The exact CREATE TABLE statements for all three tables (rfp_documents, proposals, knowledge_chunks)
- The pgvector index type and parameters you intend to use
- The full RPC function signature and query logic

Only proceed with file creation after I approve the plan.

When approved, create /frontend/supabase/schema.sql containing:
- Enable the pgvector extension: CREATE EXTENSION IF NOT EXISTS vector
- All three tables exactly as defined in AGENTS.md (column names, types, and constraints)
- An ivfflat index on knowledge_chunks.embedding for cosine similarity
- A Supabase RPC function called match_chunks(query_embedding vector(1536), match_count int)
  that returns the top match_count rows from knowledge_chunks ordered by cosine similarity

When done, explain what manual steps are needed in the Supabase dashboard to apply this schema.
```

---

## PHASE 2 — RAG Knowledge Base Pipeline  `⚡ DIRECT EXECUTE`

> Why direct: all new Python files under /agents/ingestion. No existing code is touched.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

Phase 1 is complete. We are now building Phase 2: the RAG knowledge base ingestion pipeline.
All Python code lives in /agents. Use Python 3.11+. These are all new file creations.

TASK 2.1 — PDF Parsing
- Create /agents/ingestion/parse_pdf.py
- Write an async function parse_pdf(file_path: str) -> str that uses pdfplumber to extract all
  text from a PDF, cleans whitespace artifacts, and returns the raw text string
- Add a CLI entrypoint so it can be run as: python parse_pdf.py path/to/file.pdf

TASK 2.2 — Chunking & Embedding
- Create /agents/ingestion/chunk.py
- Write a function chunk_text(text: str, max_tokens: int = 400) -> list[str] that splits text
  by double newline (paragraph boundaries first), then further splits any chunk exceeding
  max_tokens by sentences. Preserve semantic boundaries — never split mid-sentence.
- Create /agents/ingestion/embed_and_upsert.py
- Write an async function embed_and_upsert(chunks: list[str], source_doc: str, category: str) that:
    1. Calls the OpenAI text-embedding-3-small model to embed all chunks (batch in groups of 100)
    2. Upserts each chunk + its embedding into the Supabase knowledge_chunks table via supabase-py
    3. Logs progress to stdout

TASK 2.3 — Ingestion Runner
- Create /agents/ingestion/run_ingestion.py as the master CLI script
- It should accept: --file (path to PDF), --category (e.g. technical, past_rfp, legal), --source-doc (display name)
- It orchestrates: parse → chunk → embed_and_upsert
- Create /agents/requirements.txt with all necessary Python packages
- Create /agents/.env with the required env variable keys (values blank, with comments)

When done, provide a sample CLI command to ingest a test PDF and explain how to verify
embeddings were stored correctly by querying the knowledge_chunks table in Supabase.
```

---

## PHASE 3A — Individual Agents  `⚡ DIRECT EXECUTE`

> Why direct: each agent is a self-contained new file. No cross-file wiring yet.
> Do NOT create crew.py or main.py yet — those are Phase 3B.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

Phases 1 and 2 are complete. We are now building Phase 3A: the three individual CrewAI agents.
All code lives in /agents. These are all new file creations.

Important: do NOT create crew.py or main.py in this task. Those come in Phase 3B.

TASK 3.1 — Requirements Analyst Agent
- Create /agents/agents/analyst.py
- Define a CrewAI Agent with:
    - role: "Requirements Analyst"
    - goal: extract hard constraints from an RFP document
    - backstory: methodical and compliance-focused — never assumes, only states what is explicitly written
- Define its Task: given raw RFP text, output ONLY a valid JSON object matching this schema:
  { "deadline": string | null, "compliance": string[], "technical_requirements": string[], "evaluation_criteria": string[] }
- The task must set expected_output to that JSON schema description

TASK 3.2 — Technical Retrieval Agent
- Create /agents/tools/vector_search.py
- Implement a CrewAI custom Tool called VectorSearchTool that:
    - Accepts a query string
    - Calls the Supabase match_chunks RPC function with that query's embedding
    - Returns the top 5 relevant chunks as a formatted string
- Create /agents/agents/retriever.py
- Define a CrewAI Agent with role "Technical Retrieval Specialist" that uses VectorSearchTool
- Its Task: given the JSON from the Analyst, run a vector search for each requirement and return
  a structured context bundle mapping each requirement to its top retrieved chunks

TASK 3.3 — Proposal Writer Agent
- Create /agents/agents/writer.py
- Define a CrewAI Agent with:
    - role: "Proposal Writer"
    - goal: draft winning, compliant enterprise proposals
    - backstory: senior technical writer with 15 years of B2B proposal experience
- Its Task: given the original RFP text + the context bundle from the Retriever, write a full
  proposal in Markdown with these exact sections:
  Executive Summary, Technical Approach, Compliance & Timeline, Relevant Experience

When done, confirm that only these files exist: analyst.py, retriever.py, writer.py,
vector_search.py — and that crew.py and main.py were NOT created.
```

---

## PHASE 3B — Crew Orchestration & FastAPI  `🗺️ PLAN FIRST`

> Why plan-first: crew.py wires all three agents together and main.py exposes them as an API.
> A mistake in the sequential order or data shapes breaks the entire pipeline.
>
> **Before pasting:** type `/plan` in Codex, paste this prompt. Confirm the agent order
> (analyst → retriever → writer) and Pydantic model shapes before approving.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

Phase 3A is complete (analyst.py, retriever.py, writer.py, vector_search.py all exist).
We are now building Phase 3B: wiring the agents together.

Before writing any code, show me your plan:
- The sequential process order in crew.py (analyst → retriever → writer)
- The Pydantic request and response model shapes for main.py
- How the crew output maps to { rfp_id, draft_markdown, requirements } in the response
- Exactly where the try/except wraps crew.kickoff() and what happens on failure

Only proceed after I approve the plan.

TASK 3.4 — Crew Orchestration & FastAPI
- Create /agents/crew.py:
    - Import the three agents and their tasks from Phase 3A files
    - Define the sequential Crew: analyst → retriever → writer
    - Expose a run_crew(rfp_text: str) function that kicks off the crew and returns the result
- Create /agents/main.py as a FastAPI app with:
    - POST /process-rfp — accepts { rfp_text: str, rfp_id: str }, runs the Crew, returns
      { rfp_id, draft_markdown, requirements }
    - GET /health — returns { status: "ok" }
    - Pydantic models for all request and response bodies
    - try/except around crew.kickoff() — on error, update rfp_documents.status to "error"
      in Supabase and return HTTP 500 with the error detail

When done, provide the curl command to test /process-rfp locally with a short sample RFP string.
```

---

## PHASE 4 — n8n Workflow Automation  `🗺️ PLAN FIRST`

> Why plan-first: modifies existing frontend files (upload/route.ts, upload/page.tsx) AND the
> FastAPI endpoint from Phase 3B. A shape mismatch in any hand-off breaks the whole pipeline.
>
> **Before pasting:** type `/plan` in Codex, paste this prompt. Review exactly which files
> will be modified and what will change in each, then approve.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

Phases 1–3 are complete. We are now building Phase 4: n8n workflow automation.

Before writing any code, show me your plan:
- Which existing files will be modified and exactly what changes will be made to each
- The exact webhook payload shape sent from Next.js to n8n
- The n8n node sequence and the data each node passes to the next
- How status transitions (uploaded → processing → draft_ready) are triggered and where

Only proceed after I approve the plan.

TASK 4.1 — Next.js Webhook Trigger
- Create or modify /frontend/app/api/upload/route.ts:
    1. Accept a multipart form upload (the RFP PDF file)
    2. Upload the file to Supabase Storage under the bucket rfp-uploads
    3. Insert a new row into rfp_documents with status = "uploaded", return the new row's id
    4. POST to the N8N_WEBHOOK_URL env variable with { rfp_id, storage_path, file_name }
    5. Return { success: true, rfp_id } to the frontend
- Modify /frontend/app/upload/page.tsx:
    - Wire the form submit to call this API route
    - Show a loading spinner during upload
    - Redirect to /proposals on success

TASK 4.2 — n8n Workflow Definition
- Create /n8n/rfp_workflow.json — a complete exportable n8n workflow JSON with these nodes:
    1. Webhook node — receives POST from Next.js, extracts rfp_id + storage_path + file_name
    2. Supabase node — updates rfp_documents status to "processing"
    3. HTTP Request node — downloads PDF bytes from Supabase Storage via signed URL
    4. HTTP Request node — POSTs { rfp_text, rfp_id } to FastAPI /process-rfp
    5. Supabase node — inserts new row into proposals with draft_markdown and rfp_id
    6. Supabase node — updates rfp_documents status to "draft_ready"
- Add a "notes" field to each node in the JSON explaining its purpose

TASK 4.3 — Status Sync in FastAPI
- Modify /agents/main.py: after crew.kickoff() succeeds, use the Supabase client to:
    - Update rfp_documents.status to "draft_ready"
    - Write rfp_documents.extracted_requirements with the Analyst agent's JSON output

When done, write numbered step-by-step instructions for importing rfp_workflow.json into n8n
and configuring all credentials (Supabase URL, service role key, FastAPI URL).
```

---

## PHASE 5 — Human-in-the-Loop Dashboard  `🗺️ PLAN FIRST`

> Why plan-first: modifies /proposals/page.tsx from Phase 1, creates the most complex UI
> component in the project, and adds a new API route. The export logic also requires careful
> handling of TipTap editor state.
>
> **Before pasting:** type `/plan` in Codex, paste this prompt. Review the component tree,
> real-time subscription setup, and export strategy before approving.

```
Read AGENTS.md and PROJECT.md in the root directory for full project context before doing anything.

Phases 1–4 are complete. We are now building Phase 5: the human-in-the-loop review dashboard.

Before writing any code, show me your plan:
- Which existing files will be modified vs. which are new
- How the Supabase real-time subscription is set up in the proposals list (channel, filter, event type)
- The component tree for the side-by-side review page (panels, toolbar, editor, PDF viewer)
- How auto-save is debounced and which API route it calls
- The export approach for PDF (jsPDF + html2canvas) and Word (docx npm package)

Only proceed after I approve the plan.

TASK 5.1 — Real-Time Proposal List
- Modify /frontend/app/proposals/page.tsx:
    - On load, fetch all rows from rfp_documents ordered by created_at desc
    - Set up a Supabase real-time subscription on rfp_documents triggered on status changes
    - Display each RFP as a card: file_name, color-coded status badge, created_at timestamp
    - Cards with status "draft_ready" show a prominent "Review →" link to /proposals/[id]
    - Cards with status "processing" show a spinner indicator

TASK 5.2 — Side-by-Side Review Interface
- Create /frontend/app/proposals/[id]/page.tsx:
    - Fetch the rfp_document row and its related proposals row (join on rfp_id)
    - Build a two-panel layout (left 50% / right 50%, full viewport height):
        - LEFT PANEL: PDF viewer using react-pdf (pdfjs-dist), file loaded from Supabase
          Storage via a signed URL
        - RIGHT PANEL: TipTap editor initialized with draft_markdown parsed via
          @tiptap/extension-markdown. Auto-saves edited_content every 30 seconds via debounce.
- Create /frontend/app/api/proposals/[id]/route.ts:
    - PATCH — accepts { edited_content: string }, updates proposals.edited_content and
      increments proposals.version

TASK 5.3 — Export & Approve
- Add a toolbar above the two-panel layout containing:
    - "Export" dropdown with two options:
        - "Export as PDF" — jsPDF + html2canvas renders the TipTap editor DOM,
          downloads as [rfp_file_name]_proposal.pdf
        - "Export as Word" — docx npm package converts Markdown to .docx,
          downloads as [rfp_file_name]_proposal.docx
    - "Approve" button — sets rfp_documents.status to "approved", shows a shadcn/ui Sonner
      toast, disables the editor

When done, list every npm package to install for this phase and walk through the complete
end-to-end user journey from file upload to approved export.
```

---

## DEBUGGING / CONTINUATION PROMPT

> ⚡ Direct execute for isolated, single-file fixes.
> 🗺️ Plan first if the fix touches more than one file or could affect working code from a previous phase.

```
Read AGENTS.md and PROJECT.md in the root directory to restore full project context.

Check the "Current Phase Tracker" section in AGENTS.md to understand what has been completed.

[DESCRIBE YOUR CURRENT PROBLEM OR WHAT YOU WANT TO DO NEXT HERE]

Before writing any code:
1. State which phase and task this work belongs to
2. List every existing file that will be modified (not just new files)
3. If any existing files are being modified, show me the plan before executing
4. Confirm the approach matches the architecture defined in AGENTS.md
```
