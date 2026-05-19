"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const ReviewClient = dynamic(
  () => import("./review-client").then((mod) => mod.ReviewClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-73px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }
);

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

type ReviewWrapperProps = {
  rfpDocument: RfpDocument;
  proposal: Proposal;
  pdfUrl: string;
};

export function ReviewWrapper({ rfpDocument, proposal, pdfUrl }: ReviewWrapperProps) {
  return (
    <ReviewClient
      rfpDocument={rfpDocument}
      proposal={proposal}
      pdfUrl={pdfUrl}
    />
  );
}
