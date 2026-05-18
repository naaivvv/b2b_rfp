import argparse
import asyncio
import re
from pathlib import Path

import pdfplumber


def _clean_text(text: str) -> str:
  text = text.replace("\x00", "")
  text = re.sub(r"[ \t]+", " ", text)
  text = re.sub(r" *\n *", "\n", text)
  text = re.sub(r"\n{3,}", "\n\n", text)
  return text.strip()


def _extract_pdf_text(file_path: str) -> str:
  pdf_path = Path(file_path)
  if not pdf_path.exists():
    raise FileNotFoundError(f"PDF file not found: {file_path}")
  if pdf_path.suffix.lower() != ".pdf":
    raise ValueError(f"Expected a PDF file, got: {pdf_path.suffix}")

  page_text: list[str] = []
  with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
      text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
      cleaned = _clean_text(text)
      if cleaned:
        page_text.append(cleaned)

  return _clean_text("\n\n".join(page_text))


async def parse_pdf(file_path: str) -> str:
  return await asyncio.to_thread(_extract_pdf_text, file_path)


async def _main() -> None:
  parser = argparse.ArgumentParser(description="Extract text from a PDF file.")
  parser.add_argument("file", help="Path to the PDF file to parse.")
  args = parser.parse_args()

  text = await parse_pdf(args.file)
  print(text)


if __name__ == "__main__":
  asyncio.run(_main())
