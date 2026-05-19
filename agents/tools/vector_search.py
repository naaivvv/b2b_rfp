import os
from typing import Any, Type

from crewai.tools import BaseTool
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from supabase import Client, create_client


EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
DEFAULT_MATCH_COUNT = 5


class VectorSearchInput(BaseModel):
  query: str = Field(..., description="The requirement or search query text.")


def _get_supabase_client() -> Client:
  supabase_url = os.environ.get("SUPABASE_URL")
  service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

  if not supabase_url:
    raise ValueError("SUPABASE_URL is required")
  if not service_role_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")

  return create_client(supabase_url, service_role_key)


def _format_chunk(index: int, chunk: dict[str, Any]) -> str:
  content = chunk.get("content", "")
  source_doc = chunk.get("source_doc", "unknown")
  category = chunk.get("category", "unknown")
  similarity = chunk.get("similarity")
  similarity_text = (
    f"{similarity:.4f}"
    if isinstance(similarity, (int, float))
    else "unknown"
  )

  return (
    f"{index}. Source: {source_doc}\n"
    f"   Category: {category}\n"
    f"   Similarity: {similarity_text}\n"
    f"   Content: {content}"
  )


class VectorSearchTool(BaseTool):
  name: str = "Vector Search"
  description: str = (
    "Searches the Supabase knowledge_chunks vector database for the top 5 "
    "internal knowledge chunks relevant to a query string."
  )
  args_schema: Type[BaseModel] = VectorSearchInput
  match_count: int = DEFAULT_MATCH_COUNT

  def _run(self, query: str) -> str:
    load_dotenv()

    if not query.strip():
      return "No query provided."

    model = SentenceTransformer(EMBEDDING_MODEL)
    supabase = _get_supabase_client()

    query_embedding = model.encode(query).tolist()

    response = supabase.rpc(
      "match_chunks",
      {
        "query_embedding": query_embedding,
        "match_count": self.match_count
      }
    ).execute()

    chunks = response.data or []
    if not chunks:
      return f"No relevant chunks found for query: {query}"

    formatted_chunks = [
      _format_chunk(index, chunk)
      for index, chunk in enumerate(chunks, start=1)
    ]

    return (
      f"Top {len(formatted_chunks)} chunks for query: {query}\n\n"
      + "\n\n".join(formatted_chunks)
    )
