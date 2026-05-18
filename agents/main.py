import asyncio
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from supabase import Client, create_client

try:
  from crew import run_crew
except ImportError:
  from agents.crew import run_crew


load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

app = FastAPI(title="RFP Response Architect Agents API")


class ProcessRfpRequest(BaseModel):
  rfp_text: str = Field(..., min_length=1)
  rfp_id: str = Field(..., min_length=1)


class ProcessRfpResponse(BaseModel):
  rfp_id: str
  draft_markdown: str
  requirements: dict[str, Any]


class HealthResponse(BaseModel):
  status: str


def _get_supabase_client() -> Client:
  supabase_url = os.environ.get("SUPABASE_URL")
  service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

  if not supabase_url:
    raise ValueError("SUPABASE_URL is required")
  if not service_role_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY is required")

  return create_client(supabase_url, service_role_key)


def _mark_rfp_error(rfp_id: str) -> None:
  supabase = _get_supabase_client()
  supabase.table("rfp_documents").update(
    {"status": "error"}
  ).eq("id", rfp_id).execute()


def _mark_rfp_draft_ready(rfp_id: str, requirements: dict[str, Any]) -> None:
  supabase = _get_supabase_client()
  supabase.table("rfp_documents").update(
    {
      "status": "draft_ready",
      "extracted_requirements": requirements
    }
  ).eq("id", rfp_id).execute()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
  return HealthResponse(status="ok")


@app.post("/process-rfp", response_model=ProcessRfpResponse)
async def process_rfp(request: ProcessRfpRequest) -> ProcessRfpResponse:
  try:
    result = await asyncio.to_thread(run_crew, request.rfp_text)
    await asyncio.to_thread(
      _mark_rfp_draft_ready,
      request.rfp_id,
      result.requirements
    )
  except Exception as error:
    detail = str(error)
    try:
      await asyncio.to_thread(_mark_rfp_error, request.rfp_id)
    except Exception as supabase_error:
      detail = (
        f"{detail}; additionally failed to update rfp_documents.status "
        f"to error: {supabase_error}"
      )

    raise HTTPException(status_code=500, detail=detail) from error

  return ProcessRfpResponse(
    rfp_id=request.rfp_id,
    draft_markdown=result.draft_markdown,
    requirements=result.requirements
  )
