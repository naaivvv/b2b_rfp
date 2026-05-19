"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Loader2,
  Search,
  UploadCloud,
  Zap
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RfpStatus = "uploaded" | "processing" | "draft_ready" | "approved" | "error";

type RfpDocument = {
  id: string;
  file_name: string;
  storage_path: string;
  status: RfpStatus | string;
  created_at: string | null;
};

const statusConfig: Record<
  string,
  { label: string; variant: BadgeProps["variant"]; icon: typeof FileText }
> = {
  uploaded: { label: "Uploaded", variant: "muted", icon: Clock },
  processing: { label: "Processing", variant: "warning", icon: Loader2 },
  draft_ready: { label: "Draft Ready", variant: "default", icon: FileText },
  approved: { label: "Approved", variant: "success", icon: CheckCircle2 },
  error: { label: "Error", variant: "destructive", icon: Zap }
};

function getRelativeTime(value: string | null): string {
  if (!value) return "Unknown";
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value)
  );
}

export default function ProposalsPage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
      ),
    []
  );
  const [documents, setDocuments] = useState<RfpDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      const { data, error: fetchError } = await supabase
        .from("rfp_documents")
        .select("id,file_name,storage_path,status,created_at")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDocuments((data ?? []) as RfpDocument[]);
      }

      setIsLoading(false);
    }

    void loadDocuments();

    const channel = supabase
      .channel("rfp_documents_status_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rfp_documents"
        },
        (payload) => {
          const updatedDocument = payload.new as RfpDocument;

          setDocuments((currentDocuments) => {
            const existingIndex = currentDocuments.findIndex(
              (document) => document.id === updatedDocument.id
            );

            if (existingIndex === -1) {
              return [updatedDocument, ...currentDocuments];
            }

            return currentDocuments.map((document) =>
              document.id === updatedDocument.id
                ? { ...document, ...updatedDocument }
                : document
            );
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter((doc) =>
      doc.file_name.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = documents.length;
    const processing = documents.filter((d) => d.status === "processing").length;
    const drafts = documents.filter((d) => d.status === "draft_ready").length;
    const approved = documents.filter((d) => d.status === "approved").length;
    return { total, processing, drafts, approved };
  }, [documents]);

  return (
    <section className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
            Proposals
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Track and review AI-generated proposal drafts in real-time.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <UploadCloud className="mr-2 h-4 w-4" />
            New RFP
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      {!isLoading && !error && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 stagger-children">
          {[
            {
              label: "Total RFPs",
              value: stats.total,
              icon: FileText,
              color: "text-slate-300"
            },
            {
              label: "Processing",
              value: stats.processing,
              icon: Loader2,
              color: "text-amber-400",
              pulse: stats.processing > 0
            },
            {
              label: "Drafts Ready",
              value: stats.drafts,
              icon: Zap,
              color: "text-indigo-400"
            },
            {
              label: "Approved",
              value: stats.approved,
              icon: CheckCircle2,
              color: "text-emerald-400"
            }
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-card rounded-xl p-4 glass-card-hover"
              >
                <div className="flex items-center justify-between mb-3">
                  <StatIcon
                    className={`h-4 w-4 ${stat.color} ${
                      stat.pulse ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-500">
                    {stat.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-100 tracking-tight">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      {!isLoading && documents.length > 0 && (
        <div className="mb-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="glass-card flex items-center gap-3 rounded-xl p-8 animate-fade-in">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          <span className="text-sm text-slate-400">Loading proposals...</span>
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-5 text-sm text-rose-300 animate-fade-in">
          {error}
        </div>
      ) : null}

      {/* Empty State */}
      {!isLoading && !error && documents.length === 0 ? (
        <div className="glass-card flex flex-col items-center rounded-xl py-16 px-6 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Inbox className="h-8 w-8 text-slate-500" />
          </div>
          <p className="mt-5 text-lg font-semibold text-slate-200">
            No proposals yet
          </p>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Upload an RFP document to get started. Our AI agents will analyze requirements
            and draft your proposal automatically.
          </p>
          <Button asChild className="mt-6">
            <Link href="/upload">
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload your first RFP
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Document Cards */}
      {!isLoading && !error && filteredDocuments.length > 0 ? (
        <div className="grid gap-3 stagger-children">
          {filteredDocuments.map((document) => {
            const config = statusConfig[document.status] ?? {
              label: document.status,
              variant: "muted" as const,
              icon: FileText
            };
            const StatusIcon = config.icon;
            const isProcessing = document.status === "processing";
            const isDraftReady = document.status === "draft_ready";

            return (
              <article
                key={document.id}
                className={`glass-card glass-card-hover rounded-xl p-5 status-border-${document.status} transition-all duration-200`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: File info */}
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div
                      className={`mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl transition-all ${
                        isDraftReady
                          ? "bg-indigo-500/10"
                          : document.status === "approved"
                            ? "bg-emerald-500/10"
                            : isProcessing
                              ? "bg-amber-500/10"
                              : "bg-white/[0.04]"
                      }`}
                    >
                      <FileText
                        className={`h-5 w-5 ${
                          isDraftReady
                            ? "text-indigo-400"
                            : document.status === "approved"
                              ? "text-emerald-400"
                              : isProcessing
                                ? "text-amber-400"
                                : "text-slate-500"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="truncate text-sm font-semibold text-slate-100">
                        {document.file_name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={config.variant}>
                          <StatusIcon
                            className={`mr-1 h-3 w-3 ${
                              isProcessing ? "animate-spin" : ""
                            }`}
                          />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {getRelativeTime(document.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action */}
                  <div className="flex items-center gap-2 sm:flex-none">
                    {isDraftReady ? (
                      <Button asChild size="sm">
                        <Link href={`/proposals/${document.id}`}>
                          Review
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : document.status === "approved" ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/proposals/${document.id}`}>
                          View
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : isProcessing ? (
                      <span className="flex items-center gap-2 text-xs text-amber-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Generating draft...
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {/* No search results */}
      {!isLoading &&
        !error &&
        documents.length > 0 &&
        filteredDocuments.length === 0 ? (
        <div className="glass-card flex flex-col items-center rounded-xl py-12 px-6 text-center animate-fade-in">
          <Search className="h-8 w-8 text-slate-500" />
          <p className="mt-4 text-sm font-medium text-slate-300">
            No proposals match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear search
          </button>
        </div>
      ) : null}
    </section>
  );
}
