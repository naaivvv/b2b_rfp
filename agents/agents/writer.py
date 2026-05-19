from crewai import Agent, Task


try:
  from agents.llm import get_fallback_llm
except ImportError:
  from agents.agents.llm import get_fallback_llm


def create_proposal_writer_agent() -> Agent:
  return Agent(
    llm=get_fallback_llm(),
    role="Proposal Writer",
    goal="Draft winning, compliant enterprise proposals",
    backstory=(
      "You are a senior technical writer with 15 years of B2B proposal "
      "experience. You write clear, persuasive, evidence-based proposals that "
      "directly address RFP requirements and stay grounded in retrieved company "
      "context."
    ),
    allow_delegation=False,
    verbose=True
  )


def create_proposal_writer_task(
  agent: Agent,
  rfp_text: str,
  context_bundle: str
) -> Task:
  return Task(
    description=(
      "Using the original RFP text and the retrieved context bundle below, "
      "write a complete enterprise proposal in Markdown. Address the stated "
      "requirements directly, use retrieved company context where relevant, and "
      "avoid inventing facts not supported by the RFP or context bundle.\n\n"
      "The proposal must use exactly these Markdown section headings, in this "
      "order:\n"
      "# Executive Summary\n"
      "# Technical Approach\n"
      "# Compliance & Timeline\n"
      "# Relevant Experience\n\n"
      f"Original RFP text:\n{rfp_text}\n\n"
      f"Retrieved context bundle:\n{context_bundle}"
    ),
    agent=agent,
    expected_output=(
      "A full Markdown proposal with exactly these sections: Executive Summary, "
      "Technical Approach, Compliance & Timeline, Relevant Experience."
    )
  )


proposal_writer_agent = create_proposal_writer_agent()
