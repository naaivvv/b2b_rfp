create extension if not exists vector;

create table public.rfp_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_name text not null,
  storage_path text not null,
  status text not null default 'uploaded',
  extracted_requirements jsonb
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references public.rfp_documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  draft_markdown text not null,
  edited_content text,
  version integer not null default 1
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(384) not null,
  source_doc text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create index knowledge_chunks_embedding_ivfflat_idx
on public.knowledge_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function public.match_chunks(
  query_embedding vector(384),
  match_count int
)
returns table (
  id uuid,
  content text,
  source_doc text,
  category text,
  similarity double precision
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
