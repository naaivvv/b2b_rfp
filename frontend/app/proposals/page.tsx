"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { FileText, Loader2 } from "lucide-react";

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

const statusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  draft_ready: "Draft Ready",
  approved: "Approved",
  error: "Error"
};

function getStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "draft_ready" || status === "approved") {
    return "success";
  }

  if (status === "processing") {
    return "warning";
  }

  if (status === "error") {
    return "destructive";
  }

  return "muted";
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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

  useEffect(() => {
    let isMounted = true;

    async function loadDocuments() {
      const { data, error: fetchError } = await supabase
        .from("rfp_documents")
        .select("id,file_name,storage_path,status,created_at")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

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

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">
          Proposals Dashboard
        </h1>
        <p className="text-slate-600">
          Review generated proposal drafts as soon as they are available.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-white p-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading proposals
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && documents.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">
          No proposals yet
        </div>
      ) : null}

      <div className="grid gap-4">
        {documents.map((document) => (
          <article
            key={document.id}
            className="flex flex-col gap-4 rounded-lg border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-1 rounded-md bg-slate-100 p-2 text-slate-600">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-base font-semibold text-slate-950">
                  {document.file_name}
                </h2>
                <p className="text-sm text-slate-500">
                  Uploaded {formatTimestamp(document.created_at)}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant={getStatusVariant(document.status)}>
                    {statusLabels[document.status] ?? document.status}
                  </Badge>
                  {document.status === "processing" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Drafting
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {document.status === "draft_ready" ? (
              <Button asChild>
                <Link href={`/proposals/${document.id}`}>Review -&gt;</Link>
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
