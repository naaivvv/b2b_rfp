from crewai import LLM

def get_fallback_llm() -> LLM:
  """
  Returns a CrewAI LLM instance configured with Groq as the primary provider
  and OpenRouter as the fallback.
  """
  return LLM(
    model="groq/llama-3.3-70b-versatile",
    fallbacks=[
      {"model": "openrouter/auto"}
    ]
  )
