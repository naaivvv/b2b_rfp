from crewai import Agent, Task


ANALYST_JSON_SCHEMA = (
  '{ "deadline": string | null, "compliance": string[], '
  '"technical_requirements": string[], "evaluation_criteria": string[] }'
)


def create_requirements_analyst_agent() -> Agent:
  return Agent(
    role="Requirements Analyst",
    goal="Extract hard constraints from an RFP document",
    backstory=(
      "You are a methodical, compliance-focused analyst. You never assume, "
      "infer, embellish, or fill gaps. You only state constraints that are "
      "explicitly written in the RFP document."
    ),
    allow_delegation=False,
    verbose=True
  )


def create_requirements_analyst_task(agent: Agent, rfp_text: str) -> Task:
  return Task(
    description=(
      "Read the raw RFP text below and extract only hard constraints that are "
      "explicitly stated. Identify the submission deadline, compliance "
      "requirements, technical requirements, and evaluation criteria.\n\n"
      "Return ONLY a valid JSON object. Do not include Markdown, explanations, "
      "comments, citations, or surrounding text. If no deadline is explicitly "
      "written, use null. If a category has no explicitly written items, use an "
      "empty array.\n\n"
      f"RFP text:\n{rfp_text}"
    ),
    agent=agent,
    expected_output=(
      "A valid JSON object matching exactly this schema: "
      f"{ANALYST_JSON_SCHEMA}"
    )
  )


requirements_analyst_agent = create_requirements_analyst_agent()
