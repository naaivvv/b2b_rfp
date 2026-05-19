"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import { ChevronDown, Download, Loader2, Save, CheckCircle2 } from "lucide-react";
import { Document as PdfDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Use the worker from public/ to avoid bundler processing issues
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

type RfpDocument = {
  id: string;
  file_name: string;
  storage_path: string;
  status: string;
  created_at: string | null;
};

type Proposal = {
  id: string;
  rfp_id: string;
  draft_markdown: string | null;
  edited_content: string | null;
  version: number | null;
  updated_at: string | null;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type SaveResponse = {
  success?: boolean;
  version?: number;
  error?: string;
};

type ReviewClientProps = {
  rfpDocument: RfpDocument;
  proposal: Proposal;
  pdfUrl: string;
};

function getDownloadBaseName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function stripMarkdownDecorators(value: string): string {
  return value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function markdownToDocxParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      return;
    }

    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: stripMarkdownDecorators(trimmed),
          heading: HeadingLevel.HEADING_1
        })
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: stripMarkdownDecorators(trimmed),
          heading: HeadingLevel.HEADING_2
        })
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: stripMarkdownDecorators(trimmed),
          heading: HeadingLevel.HEADING_3
        })
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(stripMarkdownDecorators(trimmed))],
          bullet: { level: 0 }
        })
      );
      return;
    }

    paragraphs.push(
      new Paragraph({
        children: [new TextRun(stripMarkdownDecorators(trimmed))]
      })
    );
  });

  return paragraphs;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReviewClient({
  rfpDocument,
  proposal,
  pdfUrl
}: ReviewClientProps) {
  const initialContent = proposal.edited_content ?? proposal.draft_markdown ?? "";
  const editorHostRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef(initialContent);
  const [numPages, setNumPages] = useState<number>(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [version, setVersion] = useState(proposal.version ?? 1);
  const [isApproved, setIsApproved] = useState(rfpDocument.status === "approved");
  const [isApproving, setIsApproving] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "word" | null>(null);

  const downloadBaseName = useMemo(
    () => getDownloadBaseName(rfpDocument.file_name) || "rfp",
    [rfpDocument.file_name]
  );

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialContent,
    contentType: "markdown",
    editable: !isApproved,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-full px-8 py-6 text-sm leading-7 text-slate-900 outline-none"
      }
    },
    onUpdate: ({ editor: activeEditor }) => {
      if (isApproved) {
        return;
      }

      const markdown = activeEditor.getMarkdown();
      setSaveState(markdown === lastSavedContentRef.current ? "saved" : "dirty");
    }
  });

  const saveContent = useCallback(
    async (content: string) => {
      if (isApproved || content === lastSavedContentRef.current) {
        return;
      }

      setSaveState("saving");

      const response = await fetch(`/api/proposals/${rfpDocument.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ edited_content: content })
      });

      const payload = (await response.json()) as SaveResponse;

      if (!response.ok || !payload.success) {
        setSaveState("error");
        throw new Error(payload.error ?? "Autosave failed.");
      }

      lastSavedContentRef.current = content;
      setVersion(payload.version ?? version + 1);
      setSaveState("saved");
    },
    [isApproved, rfpDocument.id, version]
  );

  useEffect(() => {
    if (!editor || isApproved) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    if (saveState !== "dirty") {
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      void saveContent(editor.getMarkdown()).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Autosave failed.");
      });
    }, 30_000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [editor, isApproved, saveContent, saveState]);

  useEffect(() => {
    editor?.setEditable(!isApproved);
  }, [editor, isApproved]);

  async function flushSave() {
    if (!editor) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await saveContent(editor.getMarkdown());
  }

  async function exportAsPdf() {
    if (!editorHostRef.current) {
      return;
    }

    setIsExporting("pdf");

    try {
      await flushSave();
      const canvas = await html2canvas(editorHostRef.current, {
        backgroundColor: "#ffffff",
        scale: 2
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let y = margin;

      pdf.addImage(imageData, "PNG", margin, y, imageWidth, imageHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        y = heightLeft - imageHeight + margin;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, y, imageWidth, imageHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`${downloadBaseName}_proposal.pdf`);
    } finally {
      setIsExporting(null);
    }
  }

  async function exportAsWord() {
    setIsExporting("word");

    try {
      await flushSave();
      const markdown = editor?.getMarkdown() ?? lastSavedContentRef.current;
      const doc = new DocxDocument({
        sections: [
          {
            children: markdownToDocxParagraphs(markdown)
          }
        ]
      });
      const blob = await Packer.toBlob(doc);

      downloadBlob(blob, `${downloadBaseName}_proposal.docx`);
    } finally {
      setIsExporting(null);
    }
  }

  async function approveProposal() {
    setIsApproving(true);

    try {
      await flushSave();
      const response = await fetch(`/api/rfp-documents/${rfpDocument.id}/approve`, {
        method: "PATCH"
      });
      const payload = (await response.json()) as SaveResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Approval failed.");
      }

      setIsApproved(true);
      setSaveState("saved");
      toast.success("Proposal approved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-slate-50">
      <div className="flex h-[calc(100vh-73px)] flex-col">
        <div className="flex flex-col gap-3 border-b bg-white px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link href="/proposals" className="text-sm text-slate-600 hover:text-slate-950">
              Back to proposals
            </Link>
            <h1 className="truncate text-lg font-semibold text-slate-950">
              {rfpDocument.file_name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Save className="h-3.5 w-3.5" />
              {saveState === "saving"
                ? "Saving"
                : saveState === "dirty"
                  ? "Unsaved changes"
                  : saveState === "error"
                    ? "Save failed"
                    : `Version ${version}`}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isExporting !== null}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => void exportAsPdf()}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void exportAsWord()}>
                  Export as Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => void approveProposal()} disabled={isApproved || isApproving}>
              {isApproving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {isApproved ? "Approved" : "Approve"}
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          <div className="min-h-0 overflow-auto border-r bg-slate-100 p-4">
            <PdfDocument
              file={pdfUrl}
              loading={
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading PDF
                </div>
              }
              onLoadSuccess={({ numPages: loadedPages }) => setNumPages(loadedPages)}
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {Array.from({ length: numPages }, (_, index) => (
                  <Page
                    key={`page-${index + 1}`}
                    pageNumber={index + 1}
                    width={720}
                    renderTextLayer
                    renderAnnotationLayer
                    className="overflow-hidden rounded-md shadow-sm"
                  />
                ))}
              </div>
            </PdfDocument>
          </div>

          <div className="min-h-0 overflow-auto bg-white">
            <div
              ref={editorHostRef}
              className="mx-auto min-h-full max-w-3xl bg-white [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-semibold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-5 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_li]:ml-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_ul]:list-disc"
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
