import argparse
import asyncio

try:
  from .chunk import chunk_text
  from .embed_and_upsert import embed_and_upsert
  from .parse_pdf import parse_pdf
except ImportError:
  from chunk import chunk_text
  from embed_and_upsert import embed_and_upsert
  from parse_pdf import parse_pdf


async def run_ingestion(file_path: str, category: str, source_doc: str) -> None:
  print(f"Parsing PDF: {file_path}")
  text = await parse_pdf(file_path)
  print(f"Parsed {len(text)} characters.")

  print("Chunking text.")
  chunks = chunk_text(text)
  print(f"Created {len(chunks)} chunks.")

  await embed_and_upsert(chunks, source_doc=source_doc, category=category)


def _build_parser() -> argparse.ArgumentParser:
  parser = argparse.ArgumentParser(description="Ingest a PDF into the RAG knowledge base.")
  parser.add_argument("--file", required=True, help="Path to the PDF file to ingest.")
  parser.add_argument(
    "--category",
    required=True,
    help="Knowledge category, such as technical, past_rfp, or legal."
  )
  parser.add_argument("--source-doc", required=True, help="Display name for the source document.")
  return parser


async def _main() -> None:
  args = _build_parser().parse_args()
  await run_ingestion(
    file_path=args.file,
    category=args.category,
    source_doc=args.source_doc
  )


if __name__ == "__main__":
  asyncio.run(_main())
