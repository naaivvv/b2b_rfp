import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Database = {
  public: {
    Tables: {
      rfp_documents: {
        Row: {
          id: string;
          created_at: string | null;
          file_name: string;
          storage_path: string;
          status: string;
          extracted_requirements: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          file_name: string;
          storage_path: string;
          status: string;
          extracted_requirements?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          file_name?: string;
          storage_path?: string;
          status?: string;
          extracted_requirements?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const storageBucket = "rfp-uploads";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("rfp-file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "A PDF file is required." },
        { status: 400 }
      );
    }

    if (!isPdfFile(file)) {
      return NextResponse.json(
        { success: false, error: "Only PDF uploads are supported." },
        { status: 400 }
      );
    }

    const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const n8nWebhookUrl = getRequiredEnv("N8N_WEBHOOK_URL");

    const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false
      }
    });

    const safeFileName = sanitizeFileName(file.name) || "rfp.pdf";
    const storagePath = `rfp/${crypto.randomUUID()}-${safeFileName}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/pdf",
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: documentRow, error: insertError } = await supabase
      .from("rfp_documents")
      .insert({
        file_name: file.name,
        storage_path: storagePath,
        status: "uploaded"
      })
      .select("id")
      .single();

    if (insertError || !documentRow) {
      return NextResponse.json(
        {
          success: false,
          error: insertError?.message ?? "Failed to create RFP document record."
        },
        { status: 500 }
      );
    }

    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rfp_id: documentRow.id,
        storage_path: storagePath,
        file_name: file.name
      })
    });

    if (!webhookResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `n8n webhook failed with status ${webhookResponse.status}.`
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      rfp_id: documentRow.id
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
