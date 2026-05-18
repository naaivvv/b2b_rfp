# Autonomous B2B RFP Response Architect Walkthrough

This guide explains how to set up, configure, and verify every completed phase of the Autonomous B2B RFP Response Architect. It is written as an operator checklist: install the outside tools, create the required credentials, set environment variables, configure Supabase and n8n, then verify Phases 1-5 end to end.

## 0. System Map

The application has four moving parts:

1. **Next.js frontend** in `frontend/`
   - Uploads RFP PDFs.
   - Shows the proposals dashboard.
   - Provides the human review editor, export, and approve flow.

2. **Supabase**
   - Stores RFP metadata in `rfp_documents`.
   - Stores draft and edited proposals in `proposals`.
   - Stores RAG chunks and embeddings in `knowledge_chunks`.
   - Stores uploaded PDFs in the `rfp-uploads` Storage bucket.
   - Publishes realtime status changes for the dashboard.

3. **Python agents API** in `agents/`
   - FastAPI exposes `GET /health` and `POST /process-rfp`.
   - CrewAI runs Analyst -> Retriever -> Writer.
   - OpenAI provides embeddings and LLM calls.
   - Supabase pgvector provides retrieval.

4. **n8n**
   - Receives the upload webhook from Next.js.
   - Marks the RFP as `processing`.
   - Downloads and extracts the PDF text.
   - Calls FastAPI.
   - Inserts the generated proposal.
   - Marks the RFP as `draft_ready`.

End-to-end status flow:

```txt
uploaded -> processing -> draft_ready -> approved
```

## 1. External Software To Install

Install these outside the project directory:

1. **Node.js 20 LTS or newer**
   - Required by Next.js and n8n local CLI.
   - Verify:
     ```powershell
     node --version
     npm --version
     ```

2. **Python 3.11**
   - Required by FastAPI, CrewAI, and ingestion scripts.
   - Verify:
     ```powershell
     python --version
     ```
   - On Windows, make sure "Add Python to PATH" is selected during installation.

3. **Docker Desktop**
   - Required if you run n8n with `docker-compose.yml`.
   - Verify:
     ```powershell
     docker --version
     docker compose version
     ```

4. **Supabase project**
   - You need the project URL, anon public key, service role key, SQL editor, Storage, and Realtime.

5. **OpenAI API account**
   - You need an API key with access to:
     - `text-embedding-3-small`
     - the configured CrewAI LLM, currently GPT-4o by project convention.

6. **n8n**
   - Use either n8n Cloud, local n8n via Docker, or local n8n via `npx n8n`.

7. **Optional: ngrok or Cloudflare Tunnel**
   - Useful if your Next.js app or n8n webhook must be reachable from another machine or a deployed service.

## 2. Required API Keys And Credentials

### OpenAI

Create an OpenAI API key and store it only in `agents/.env`:

```env
OPENAI_API_KEY=sk-...
```

### Supabase

From Supabase Project Settings -> API, collect:

```txt
Project URL
Anon public key
Service role key
```

Use them like this:

- `NEXT_PUBLIC_SUPABASE_URL`: frontend-safe project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: frontend-safe anon key.
- `SUPABASE_URL`: Python/n8n project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key. Never expose it in browser code or commit it.

### n8n

You need:

- The production webhook URL from the imported workflow's Webhook node.
- A Supabase credential for Supabase database nodes.
- An HTTP Header Auth credential for Supabase Storage signed URL creation.
- Optional n8n login credentials if running locally with authentication enabled.

### FastAPI

n8n needs the base URL of the FastAPI agents service:

```txt
http://localhost:8000
```

If n8n runs in Docker and FastAPI runs on the host, `localhost` from inside the n8n container may not point to your host. Use one of these instead:

```txt
http://host.docker.internal:8000
```

or a tunnel/public URL.

## 3. Environment Variables

### Frontend: `frontend/.env.local`

Create or update:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
N8N_WEBHOOK_URL=http://localhost:5678/webhook/rfp-upload
```

Notes:

- `NEXT_PUBLIC_*` variables are sent to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` is used only inside Next.js server route handlers.
- `N8N_WEBHOOK_URL` must be the active n8n webhook URL, not the test URL unless you are manually testing.

### Agents: `agents/.env`

Create or update:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### n8n: `n8n/.env`

Create or update:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
FASTAPI_URL=http://localhost:8000
```

If n8n runs in Docker and FastAPI runs on your host machine:

```env
FASTAPI_URL=http://host.docker.internal:8000
```

## 4. Supabase Setup

### 4.1 Enable pgvector

In Supabase SQL Editor:

```sql
create extension if not exists vector;
```

### 4.2 Create Tables

Run this in Supabase SQL Editor:

```sql
create table if not exists public.rfp_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_name text not null,
  storage_path text not null,
  status text not null default 'uploaded',
  extracted_requirements jsonb
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references public.rfp_documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  draft_markdown text,
  edited_content text,
  version integer not null default 1
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536) not null,
  source_doc text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_embedding_idx
on public.knowledge_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
```

Why `1536`: OpenAI `text-embedding-3-small` returns 1536-dimensional embeddings. If you change embedding models, recreate the vector column with the matching dimension.

### 4.3 Create Vector Search RPC

The Retriever agent calls `match_chunks`. Add this function:

```sql
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  source_doc text,
  category text,
  similarity float
)
language sql
stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.content,
    knowledge_chunks.source_doc,
    knowledge_chunks.category,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;
```

### 4.4 Create Storage Bucket

In Supabase Storage:

1. Create a bucket named:
   ```txt
   rfp-uploads
   ```
2. Keep it private.
3. The app uses service role permissions and signed URLs, so the bucket does not need to be public.

### 4.5 Enable Realtime

The proposals dashboard subscribes to updates on `rfp_documents`.

In Supabase Dashboard:

1. Go to Database -> Replication or Realtime.
2. Enable Realtime for `public.rfp_documents`.

Or run:

```sql
alter publication supabase_realtime add table public.rfp_documents;
```

If it already exists in the publication, Supabase may return a duplicate-object notice. That is fine.

## 5. Install Project Dependencies

### Frontend

```powershell
cd C:\b2b_rfp\frontend
npm install
```

Expected major frontend packages include:

```txt
Next.js
React
Tailwind CSS
Supabase JS
TipTap
react-pdf
pdfjs-dist
jspdf
html2canvas
docx
sonner
Radix dropdown menu
```

Verify:

```powershell
npm.cmd run build
```

Use `npm.cmd` on Windows if PowerShell blocks `npm.ps1`.

### Agents

```powershell
cd C:\b2b_rfp\agents
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Required Python packages are listed in `agents/requirements.txt`:

```txt
openai
pdfplumber
python-dotenv
supabase
crewai
fastapi
uvicorn
```

## 6. Running The App Locally

Use three terminals.

### Terminal 1: FastAPI agents service

```powershell
cd C:\b2b_rfp\agents
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify:

```powershell
curl http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

### Terminal 2: n8n

Option A: Docker Compose:

```powershell
cd C:\b2b_rfp
docker compose up n8n
```

Then open:

```txt
http://localhost:5678
```

Option B: local n8n CLI using `n8n/.env`:

```powershell
cd C:\b2b_rfp\n8n
npx dotenv-cli -e .env -- npx n8n start
```

### Terminal 3: Next.js frontend

```powershell
cd C:\b2b_rfp\frontend
npm.cmd run dev
```

Open:

```txt
http://localhost:3000
```

## 7. Phase 1 Verification: Architecture And Infrastructure

Phase 1 is working when all base services run and can see their required configuration.

### Check frontend

```powershell
cd C:\b2b_rfp\frontend
npm.cmd run build
npm.cmd run dev
```

Open:

```txt
http://localhost:3000/upload
http://localhost:3000/proposals
```

Expected:

- Upload page renders.
- Proposals dashboard renders.
- No missing environment variable errors in the terminal.

### Check Supabase

In Supabase Table Editor, confirm these exist:

```txt
rfp_documents
proposals
knowledge_chunks
```

In Storage, confirm:

```txt
rfp-uploads
```

In SQL Editor, verify pgvector:

```sql
select extname from pg_extension where extname = 'vector';
```

Expected: one row with `vector`.

### Check n8n

Open:

```txt
http://localhost:5678
```

Expected:

- n8n UI loads.
- You can import workflows.

## 8. Phase 2 Verification: RAG Knowledge Base Pipeline

Phase 2 is working when PDFs can be parsed, chunked, embedded, and stored in `knowledge_chunks`.

### Run ingestion

Use a company knowledge PDF, past proposal, or technical documentation PDF:

```powershell
cd C:\b2b_rfp\agents
.\venv\Scripts\Activate.ps1
python ingestion\run_ingestion.py --file "C:\path\to\company-doc.pdf" --category technical --source-doc "Company Technical Overview"
```

Other useful categories:

```txt
technical
legal
past_rfp
company_profile
security
pricing
```

Expected terminal output:

```txt
Parsing PDF...
Parsed X characters.
Chunking text.
Created X chunks.
Embedding X chunks with text-embedding-3-small.
Upserting batch...
Ingestion upsert complete.
```

### Verify Supabase rows

In Supabase SQL Editor:

```sql
select count(*) from public.knowledge_chunks;
```

Expected: count greater than zero.

Inspect recent rows:

```sql
select source_doc, category, left(content, 120) as preview, created_at
from public.knowledge_chunks
order by created_at desc
limit 10;
```

### Verify vector RPC

Use a real query related to your ingested docs:

```sql
select *
from public.match_chunks(
  (
    select embedding
    from public.knowledge_chunks
    limit 1
  ),
  5
);
```

Expected: up to 5 matching chunks with similarity scores.

## 9. Phase 3 Verification: CrewAI Agentic Core

Phase 3 is working when the agents API can receive RFP text, run the crew, retrieve context, produce Markdown, and update Supabase on success or error.

### Start FastAPI

```powershell
cd C:\b2b_rfp\agents
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Check health

```powershell
curl http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

### Test `/process-rfp`

First create or reuse an `rfp_documents` row in Supabase and copy its `id`. Then:

```powershell
$body = @{
  rfp_id = "paste-rfp-document-uuid-here"
  rfp_text = "RFP deadline is June 30. Vendor must provide SOC 2 compliance, cloud hosting, support SLAs, and implementation plan."
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8000/process-rfp" `
  -ContentType "application/json" `
  -Body $body
```

Expected response:

```json
{
  "rfp_id": "...",
  "draft_markdown": "...",
  "requirements": {
    "deadline": "...",
    "compliance": [],
    "technical_requirements": [],
    "evaluation_criteria": []
  }
}
```

Expected Supabase effect:

```sql
select status, extracted_requirements
from public.rfp_documents
where id = 'paste-rfp-document-uuid-here';
```

Expected:

```txt
status = draft_ready
extracted_requirements contains JSON
```

If the crew fails, `agents/main.py` attempts to set:

```txt
status = error
```

## 10. Phase 4 Verification: n8n Workflow Automation

Phase 4 is working when uploading through Next.js triggers n8n, n8n calls FastAPI, and Supabase receives a proposal row.

### Import workflow

1. Open n8n.
2. Choose Import from File.
3. Import:
   ```txt
   C:\b2b_rfp\n8n\rfp_workflow.json
   ```
4. Save the workflow.

### Configure n8n environment variables

Make sure n8n has:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
FASTAPI_URL=http://localhost:8000
```

If using Docker and FastAPI is on the host:

```env
FASTAPI_URL=http://host.docker.internal:8000
```

### Configure n8n credentials

#### Supabase node credential

Create a Supabase credential named something like:

```txt
Supabase Service Role
```

Use:

```txt
Host/URL: https://your-project-ref.supabase.co
Service Role Secret: your service role key
```

Assign this credential to:

- `Supabase - Mark Processing`
- `Supabase - Insert Proposal`
- `Supabase - Mark Draft Ready`

#### HTTP Header Auth credential

Create an HTTP Header Auth credential:

```txt
Name: Supabase Service Role Header
Header Name: Authorization
Header Value: Bearer your-supabase-service-role-key
```

Assign it to:

- `HTTP - Create Signed URL`

### Check workflow nodes

The workflow should run this sequence:

1. `Webhook - Receive Upload`
   - Receives:
     ```json
     {
       "rfp_id": "...",
       "storage_path": "rfp/uuid-file.pdf",
       "file_name": "file.pdf"
     }
     ```

2. `Supabase - Mark Processing`
   - Updates `rfp_documents.status = processing`.

3. `HTTP - Create Signed URL`
   - Creates a signed URL for the private object in `rfp-uploads`.

4. `HTTP - Download PDF`
   - Downloads PDF bytes.

5. `Extract From File - PDF Text`
   - Extracts text from PDF bytes.

6. `HTTP - Run FastAPI Crew`
   - POSTs:
     ```json
     {
       "rfp_id": "...",
       "rfp_text": "..."
     }
     ```

7. `Supabase - Insert Proposal`
   - Inserts into `proposals`.

8. `Supabase - Mark Draft Ready`
   - Confirms `rfp_documents.status = draft_ready`.

### Configure frontend webhook URL

After activating the workflow, copy the production webhook URL from n8n and put it in `frontend/.env.local`:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/rfp-upload
```

For n8n test mode, use the test URL only while manually listening for one execution.

### End-to-end Phase 4 test

1. Start FastAPI.
2. Start n8n and activate the workflow.
3. Start Next.js.
4. Open:
   ```txt
   http://localhost:3000/upload
   ```
5. Upload a PDF.

Expected Supabase sequence:

```sql
select file_name, status, storage_path, extracted_requirements
from public.rfp_documents
order by created_at desc
limit 1;
```

Expected status movement:

```txt
uploaded -> processing -> draft_ready
```

Then:

```sql
select rfp_id, left(draft_markdown, 200) as draft_preview, version
from public.proposals
order by created_at desc
limit 1;
```

Expected:

- A proposal row exists.
- `draft_markdown` is populated.
- `version = 1`.

## 11. Phase 5 Verification: Human-In-The-Loop Dashboard

Phase 5 is working when the dashboard updates in realtime, the review page shows the PDF and editor, autosave works, exports download, and approval disables editing.

### 5.1 Realtime proposal list

Open:

```txt
http://localhost:3000/proposals
```

Expected:

- Rows from `rfp_documents` are shown as cards.
- Cards show:
  - `file_name`
  - status badge
  - `created_at`
  - spinner for `processing`
  - `Review ->` link for `draft_ready`

Realtime subscription details:

```txt
Channel: rfp_documents_status_changes
Event: UPDATE
Schema: public
Table: rfp_documents
Filter: none
```

Manual realtime test:

```sql
update public.rfp_documents
set status = 'processing'
where id = 'some-rfp-id';

update public.rfp_documents
set status = 'draft_ready'
where id = 'some-rfp-id';
```

Expected:

- The open `/proposals` page updates without a browser refresh.

### 5.2 Side-by-side review

Click `Review ->` on a `draft_ready` card.

Expected:

- Left panel loads the original PDF from Supabase Storage through a signed URL.
- Right panel loads the proposal content in TipTap.
- Toolbar shows:
  - back link
  - save/version status
  - Export dropdown
  - Approve button

If the PDF does not load:

- Confirm the `rfp-uploads` bucket exists.
- Confirm `rfp_documents.storage_path` points to a real object key.
- Confirm the service role key is valid in `frontend/.env.local`.
- Confirm the browser can reach the PDF.js worker CDN used by `react-pdf`.

### 5.3 Autosave

Edit the proposal text in the right panel.

Expected:

- Save label changes to `Unsaved changes`.
- After 30 seconds, the app calls:
  ```txt
  PATCH /api/proposals/:rfp_id
  ```
- The API updates:
  ```txt
  proposals.edited_content
  proposals.updated_at
  proposals.version = version + 1
  ```

Verify in Supabase:

```sql
select edited_content, version, updated_at
from public.proposals
where rfp_id = 'some-rfp-id'
order by created_at desc
limit 1;
```

### 5.4 Export as PDF

In the review toolbar:

1. Click Export.
2. Choose Export as PDF.

Expected:

- The editor DOM is rendered with `html2canvas`.
- `jsPDF` downloads:
  ```txt
  [rfp_file_name]_proposal.pdf
  ```

### 5.5 Export as Word

In the review toolbar:

1. Click Export.
2. Choose Export as Word.

Expected:

- Markdown is converted into basic DOCX paragraphs, headings, and bullets.
- `docx` downloads:
  ```txt
  [rfp_file_name]_proposal.docx
  ```

### 5.6 Approve

Click Approve.

Expected:

- Pending edits are saved first.
- The app calls:
  ```txt
  PATCH /api/rfp-documents/:rfp_id/approve
  ```
- Supabase updates:
  ```txt
  rfp_documents.status = approved
  ```
- Sonner toast shows `Proposal approved.`
- Editor becomes disabled.

Verify:

```sql
select status
from public.rfp_documents
where id = 'some-rfp-id';
```

Expected:

```txt
approved
```

## 12. Full End-To-End Acceptance Test

Run this after all setup is complete.

1. Start FastAPI:
   ```powershell
   cd C:\b2b_rfp\agents
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. Start n8n and activate the imported workflow.

3. Start frontend:
   ```powershell
   cd C:\b2b_rfp\frontend
   npm.cmd run dev
   ```

4. Open:
   ```txt
   http://localhost:3000/upload
   ```

5. Upload an RFP PDF.

6. Confirm Supabase Storage has the uploaded file:
   ```txt
   rfp-uploads/rfp/...
   ```

7. Confirm `rfp_documents` row appears:
   ```sql
   select id, file_name, storage_path, status
   from public.rfp_documents
   order by created_at desc
   limit 1;
   ```

8. Watch n8n execution.

9. Confirm the RFP reaches:
   ```txt
   draft_ready
   ```

10. Confirm a proposal row exists:
    ```sql
    select rfp_id, version, left(draft_markdown, 200)
    from public.proposals
    order by created_at desc
    limit 1;
    ```

11. Open:
    ```txt
    http://localhost:3000/proposals
    ```

12. Click `Review ->`.

13. Edit the proposal and wait 30 seconds.

14. Confirm `edited_content` and `version` changed.

15. Export PDF.

16. Export Word.

17. Click Approve.

18. Confirm:
    ```sql
    select status
    from public.rfp_documents
    order by created_at desc
    limit 1;
    ```

    Expected:
    ```txt
    approved
    ```

## 13. Troubleshooting

### Frontend says a Supabase env var is missing

Check `frontend/.env.local` and restart the Next.js dev server. Next.js reads env vars at startup.

### Upload succeeds but n8n is not triggered

Check:

- `N8N_WEBHOOK_URL` in `frontend/.env.local`.
- n8n workflow is active.
- You are using the production webhook URL for normal runs.
- n8n is reachable from the Next.js runtime.

### n8n cannot call FastAPI

Check `FASTAPI_URL`.

- If n8n is local CLI and FastAPI is local:
  ```env
  FASTAPI_URL=http://localhost:8000
  ```

- If n8n is Docker and FastAPI is on host:
  ```env
  FASTAPI_URL=http://host.docker.internal:8000
  ```

### FastAPI returns an OpenAI error

Check:

- `OPENAI_API_KEY` is present in `agents/.env`.
- The key has available credits.
- The model used by CrewAI is available to the account.

### Retriever returns no context

Check:

- `knowledge_chunks` has rows.
- Embeddings are 1536 dimensions.
- `match_chunks` RPC exists.
- The source documents are relevant to the RFP.

### Proposal list does not update live

Check:

- Supabase Realtime is enabled for `rfp_documents`.
- Browser console has no Supabase connection error.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are valid.

### Review page returns 404

The review page requires both:

- An `rfp_documents` row with the route ID.
- A related `proposals` row where `proposals.rfp_id = rfp_documents.id`.

If n8n has not inserted the proposal yet, the review page is not ready.

### PDF viewer does not render

Check:

- The Storage object exists at `rfp_documents.storage_path`.
- The `rfp-uploads` bucket exists.
- The frontend service role key can create signed URLs.
- The browser can reach `https://unpkg.com` for the PDF.js worker.

### PowerShell blocks npm

Use:

```powershell
npm.cmd run build
npm.cmd run dev
```

instead of:

```powershell
npm run build
npm run dev
```

## 14. Security Notes

- Never commit `.env`, `.env.local`, service role keys, or OpenAI keys.
- `SUPABASE_SERVICE_ROLE_KEY` belongs only in server-side environments:
  - `frontend/.env.local` for Next.js route handlers.
  - `agents/.env`.
  - n8n credentials.
- The browser should only receive:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Keep `rfp-uploads` private and use signed URLs.
- Consider adding authentication before using this with real company RFPs.

## 15. Production Readiness Checklist

Before using this with real business data:

- Add user authentication to the frontend.
- Add row-level security policies if users should only see their own RFPs.
- Add audit logs for proposal edits and approvals.
- Move FastAPI to a persistent host.
- Use HTTPS for FastAPI and n8n.
- Store secrets in platform secret managers.
- Add n8n workflow error branches that set `rfp_documents.status = error`.
- Add retry policies for OpenAI, Supabase, and FastAPI calls.
- Add file size limits and virus scanning for PDF uploads.
- Add structured logging for the agents service.
- Add automated tests for route handlers and ingestion.
