import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { ReviewClient } from "./review-client";

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

type Database = {
  public: {
    Tables: {
      rfp_documents: {
        Row: RfpDocument;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      proposals: {
        Row: Proposal;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function createSupabaseServiceClient() {
  return createClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false
      }
    }
  );
}

export default async function ProposalReviewPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServiceClient();

  const { data: rfpDocument } = await supabase
    .from("rfp_documents")
    .select("id,file_name,storage_path,status,created_at")
    .eq("id", params.id)
    .single();

  if (!rfpDocument) {
    notFound();
  }

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id,rfp_id,draft_markdown,edited_content,version,updated_at")
    .eq("rfp_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!proposal) {
    notFound();
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("rfp-uploads")
    .createSignedUrl(rfpDocument.storage_path, 60 * 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(signedUrlError?.message ?? "Unable to create PDF signed URL.");
  }

  return (
    <ReviewClient
      rfpDocument={rfpDocument}
      proposal={proposal}
      pdfUrl={signedUrlData.signedUrl}
    />
  );
}
