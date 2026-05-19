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
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  PenLine,
  Save
} from "lucide-react";
import { Document as PdfDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

function SaveIndicator({ state, version }: { state: SaveState; version: number }) {
  const config = {
    idle: { icon: Save, text: `v${version}`, color: "text-slate-500" },
    dirty: { icon: PenLine, text: "Unsaved", color: "text-amber-400" },
    saving: { icon: Loader2, text: "Saving...", color: "text-indigo-400" },
    saved: { icon: CheckCircle2, text: `v${version}`, color: "text-emerald-400" },
    error: { icon: Save, text: "Failed", color: "text-rose-400" }
  };

  const { icon: Icon, text, color } = config[state];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color} transition-colors`}>
      <Icon className={`h-3.5 w-3.5 ${state === "saving" ? "animate-spin" : ""}`} />
      {text}
    </span>
  );
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
  const [currentPage, setCurrentPage] = useState(1);
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
        class: "min-h-full outline-none"
      }
    },
    onUpdate: ({ editor: activeEditor }) => {
      if (isApproved) return;

      const markdown = activeEditor.getMarkdown();
      setSaveState(markdown === lastSavedContentRef.current ? "saved" : "dirty");
    }
  });

  const saveContent = useCallback(
    async (content: string) => {
      if (isApproved || content === lastSavedContentRef.current) return;

      setSaveState("saving");

      const response = await fetch(`/api/proposals/${rfpDocument.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
    if (!editor || isApproved) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (saveState !== "dirty") return;

    saveTimerRef.current = setTimeout(() => {
      void saveContent(editor.getMarkdown()).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Autosave failed.");
      });
    }, 30_000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, isApproved, saveContent, saveState]);

  useEffect(() => {
    editor?.setEditable(!isApproved);
  }, [editor, isApproved]);

  async function flushSave() {
    if (!editor) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await saveContent(editor.getMarkdown());
  }

  async function exportAsPdf() {
    if (!editorHostRef.current) return;

    setIsExporting("pdf");

    try {
      await flushSave();
      const canvas = await html2canvas(editorHostRef.current, {
        backgroundColor: "#0d1117",
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
      toast.success("PDF exported successfully.");
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
        sections: [{ children: markdownToDocxParagraphs(markdown) }]
      });
      const blob = await Packer.toBlob(doc);

      downloadBlob(blob, `${downloadBaseName}_proposal.docx`);
      toast.success("Word document exported successfully.");
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
      toast.success("Proposal approved successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 animate-fade-in">
      <div className="flex h-[calc(100dvh-57px)] flex-col bg-background">
        {/* ─── Top Toolbar ─── */}
        <div className="flex flex-col gap-3 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl px-5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Navigation + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 flex-none">
              <Link href="/proposals">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Link href="/proposals" className="hover:text-slate-300 transition-colors">
                  Proposals
                </Link>
                <span>/</span>
                <span className="truncate text-slate-400">
                  {rfpDocument.file_name}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <SaveIndicator state={saveState} version={version} />

            {isApproved && (
              <Badge variant="success" className="animate-fade-in">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Approved
              </Badge>
            )}

            <div className="h-4 w-px bg-white/10" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting !== null}>
                  {isExporting ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Export
                  <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
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

            {!isApproved && (
              <Button
                onClick={() => void approveProposal()}
                disabled={isApproving}
                variant="success"
                size="sm"
              >
                {isApproving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Approve
              </Button>
            )}
          </div>
        </div>

        {/* ─── Split Pane ─── */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
          {/* ── PDF Viewer Panel ── */}
          <div className="min-h-0 flex flex-col border-r border-white/[0.06] bg-[#0a0e17]">
            {/* PDF Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">
                  RFP Document
                </span>
              </div>
              {numPages > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-400 min-w-[4rem] text-center">
                    {currentPage} / {numPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                    disabled={currentPage >= numPages}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* PDF Content */}
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <PdfDocument
                file={pdfUrl}
                loading={
                  <div className="flex items-center gap-2 py-12 justify-center text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    Loading PDF...
                  </div>
                }
                onLoadSuccess={({ numPages: loadedPages }) => {
                  setNumPages(loadedPages);
                  setCurrentPage(1);
                }}
              >
                <div className="mx-auto flex max-w-3xl flex-col gap-4">
                  {Array.from({ length: numPages }, (_, index) => (
                    <div
                      key={`page-${index + 1}`}
                      id={`pdf-page-${index + 1}`}
                      className={`transition-opacity duration-200 ${
                        index + 1 === currentPage ? "opacity-100" : "opacity-60"
                      }`}
                    >
                      <Page
                        pageNumber={index + 1}
                        width={720}
                        renderTextLayer
                        renderAnnotationLayer
                        className="overflow-hidden rounded-lg shadow-2xl shadow-black/40"
                      />
                    </div>
                  ))}
                </div>
              </PdfDocument>
            </div>
          </div>

          {/* ── Editor Panel ── */}
          <div className="min-h-0 flex flex-col bg-[#0d1117]">
            {/* Editor Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">
                  Proposal Editor
                </span>
              </div>
              {isApproved && (
                <span className="text-xs text-slate-500">Read-only</span>
              )}
            </div>

            {/* Editor Content */}
            <div className="min-h-0 flex-1 overflow-auto">
              <div
                ref={editorHostRef}
                className="mx-auto min-h-full max-w-3xl"
              >
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
