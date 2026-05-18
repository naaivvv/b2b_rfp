import asyncio
import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from supabase import Client, create_client


EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 100


def _get_supabase_client() -> Client:
  supabase_url = os.environ.get("SUPABASE_URL")
  service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

  if not supabase_url:
    raise ValueError("SUPABASE_URL is required")
  if not service_role_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")

  return create_client(supabase_url, service_role_key)


def _upsert_records(supabase: Client, records: list[dict[str, Any]]) -> None:
  response = supabase.table("knowledge_chunks").upsert(records).execute()
  if getattr(response, "data", None) is None:
    raise RuntimeError("Supabase upsert returned no data")


async def embed_and_upsert(
  chunks: list[str],
  source_doc: str,
  category: str
) -> None:
  load_dotenv()

  if not chunks:
    print("No chunks to embed; skipping upsert.")
    return

  client = AsyncOpenAI()
  supabase = _get_supabase_client()
  total = len(chunks)

  print(f"Embedding {total} chunks with {EMBEDDING_MODEL}.")

  for start in range(0, total, BATCH_SIZE):
    batch = chunks[start:start + BATCH_SIZE]
    batch_number = (start // BATCH_SIZE) + 1
    print(f"Embedding batch {batch_number}: chunks {start + 1}-{start + len(batch)} of {total}.")

    embedding_response = await client.embeddings.create(
      model=EMBEDDING_MODEL,
      input=batch
    )

    records = [
      {
        "content": chunk,
        "embedding": embedding.embedding,
        "source_doc": source_doc,
        "category": category
      }
      for chunk, embedding in zip(batch, embedding_response.data)
    ]

    print(f"Upserting batch {batch_number} to Supabase.")
    await asyncio.to_thread(_upsert_records, supabase, records)
    print(f"Stored {start + len(batch)} of {total} chunks.")

  print("Ingestion upsert complete.")
