import json
from typing import Any

from crewai import Crew, Process
from pydantic import BaseModel

try:
  from agents.analyst import (
    create_requirements_analyst_agent,
    create_requirements_analyst_task
  )
  from agents.retriever import (
    create_technical_retrieval_agent,
    create_technical_retrieval_task
  )
  from agents.writer import (
    create_proposal_writer_agent,
    create_proposal_writer_task
  )
except ImportError:
  from agents.agents.analyst import (
    create_requirements_analyst_agent,
    create_requirements_analyst_task
  )
  from agents.agents.retriever import (
    create_technical_retrieval_agent,
    create_technical_retrieval_task
  )
  from agents.agents.writer import (
    create_proposal_writer_agent,
    create_proposal_writer_task
  )


class CrewRunResult(BaseModel):
  requirements: dict[str, Any]
  context_bundle: str
  draft_markdown: str


def _output_to_text(output: Any) -> str:
  if output is None:
    return ""

  raw = getattr(output, "raw", None)
  if raw is not None:
    return str(raw)

  return str(output)


def _parse_requirements(output: Any) -> dict[str, Any]:
  requirements_text = _output_to_text(output).strip()
  if not requirements_text:
    raise ValueError("Requirements Analyst returned an empty response")

  parsed = json.loads(requirements_text)
  if not isinstance(parsed, dict):
    raise ValueError("Requirements Analyst response must be a JSON object")

  return parsed


def run_crew(rfp_text: str) -> CrewRunResult:
  analyst = create_requirements_analyst_agent()
  retriever = create_technical_retrieval_agent()
  writer = create_proposal_writer_agent()

  analyst_task = create_requirements_analyst_task(analyst, rfp_text)
  retriever_task = create_technical_retrieval_task(
    retriever,
    "Use the Requirements Analyst task output from context."
  )
  writer_task = create_proposal_writer_task(
    writer,
    rfp_text,
    "Use the Technical Retrieval Specialist task output from context."
  )

  retriever_task.context = [analyst_task]
  writer_task.context = [retriever_task]

  crew = Crew(
    agents=[analyst, retriever, writer],
    tasks=[analyst_task, retriever_task, writer_task],
    process=Process.sequential
  )

  try:
    crew_result = crew.kickoff()
  except Exception:
    raise

  requirements = _parse_requirements(analyst_task.output)
  context_bundle = _output_to_text(retriever_task.output)
  draft_markdown = _output_to_text(writer_task.output or crew_result)

  if not draft_markdown.strip():
    raise ValueError("Proposal Writer returned an empty response")

  return CrewRunResult(
    requirements=requirements,
    context_bundle=context_bundle,
    draft_markdown=draft_markdown
  )
