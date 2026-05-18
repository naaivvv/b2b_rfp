from crewai import Agent, Task

try:
  from tools.vector_search import VectorSearchTool
except ImportError:
  from agents.tools.vector_search import VectorSearchTool


def create_technical_retrieval_agent() -> Agent:
  return Agent(
    role="Technical Retrieval Specialist",
    goal=(
      "Retrieve the most relevant internal company knowledge for each RFP "
      "requirement"
    ),
    backstory=(
      "You are a precise retrieval specialist who maps RFP requirements to "
      "grounded internal knowledge. You preserve requirement wording and "
      "separate retrieved evidence by requirement."
    ),
    tools=[VectorSearchTool()],
    allow_delegation=False,
    verbose=True
  )


def create_technical_retrieval_task(
  agent: Agent,
  analyst_json: str
) -> Task:
  return Task(
    description=(
      "Given the Requirements Analyst JSON below, run a vector search for each "
      "requirement. Search the deadline when present, every compliance item, "
      "every technical requirement, and every evaluation criterion. Use the "
      "Vector Search tool once per requirement.\n\n"
      "Return a structured context bundle mapping each exact requirement to "
      "its top retrieved chunks. Preserve the source document, category, and "
      "similarity details returned by the tool. If a requirement has no useful "
      "matches, include it with an empty chunks list.\n\n"
      f"Requirements JSON:\n{analyst_json}"
    ),
    agent=agent,
    expected_output=(
      "A structured context bundle where each requirement maps to its top "
      "retrieved chunks, including chunk content, source_doc, category, and "
      "similarity when available."
    )
  )


technical_retrieval_agent = create_technical_retrieval_agent()
