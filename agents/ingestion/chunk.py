import re


SENTENCE_PATTERN = re.compile(r"[^.!?]+(?:[.!?]+[\"')\]]*|$)", re.MULTILINE)


def _estimate_tokens(text: str) -> int:
  return len(re.findall(r"\S+", text))


def _split_sentences(text: str) -> list[str]:
  sentences = [match.group(0).strip() for match in SENTENCE_PATTERN.finditer(text)]
  return [sentence for sentence in sentences if sentence]


def _pack_sentences(sentences: list[str], max_tokens: int) -> list[str]:
  chunks: list[str] = []
  current: list[str] = []
  current_tokens = 0

  for sentence in sentences:
    sentence_tokens = _estimate_tokens(sentence)

    if current and current_tokens + sentence_tokens > max_tokens:
      chunks.append(" ".join(current).strip())
      current = []
      current_tokens = 0

    current.append(sentence)
    current_tokens += sentence_tokens

  if current:
    chunks.append(" ".join(current).strip())

  return chunks


def chunk_text(text: str, max_tokens: int = 400) -> list[str]:
  if max_tokens < 1:
    raise ValueError("max_tokens must be greater than 0")

  normalized = re.sub(r"\r\n?", "\n", text).strip()
  if not normalized:
    return []

  paragraphs = [
    re.sub(r"\s+", " ", paragraph).strip()
    for paragraph in re.split(r"\n\s*\n", normalized)
  ]
  paragraphs = [paragraph for paragraph in paragraphs if paragraph]

  chunks: list[str] = []
  current: list[str] = []
  current_tokens = 0

  for paragraph in paragraphs:
    paragraph_tokens = _estimate_tokens(paragraph)

    if paragraph_tokens > max_tokens:
      if current:
        chunks.append("\n\n".join(current).strip())
        current = []
        current_tokens = 0
      chunks.extend(_pack_sentences(_split_sentences(paragraph), max_tokens))
      continue

    if current and current_tokens + paragraph_tokens > max_tokens:
      chunks.append("\n\n".join(current).strip())
      current = []
      current_tokens = 0

    current.append(paragraph)
    current_tokens += paragraph_tokens

  if current:
    chunks.append("\n\n".join(current).strip())

  return [chunk for chunk in chunks if chunk]
