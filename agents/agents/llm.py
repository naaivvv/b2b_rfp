from crewai import LLM


def get_openrouter_llm() -> LLM:
  """
  Returns a CrewAI LLM instance configured to use OpenRouter exclusively.
  """
  return LLM(model="openrouter/auto")
