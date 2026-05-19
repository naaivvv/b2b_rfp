import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Database = {
  public: {
    Tables: {
      proposals: {
        Row: {
          id: string;
          rfp_id: string;
          edited_content: string | null;
          version: number | null;
          updated_at: string | null;
        };
        Insert: Record<string, never>;
        Update: {
          edited_content?: string | null;
          version?: number;
          updated_at?: string;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { edited_content?: unknown };

    if (typeof body.edited_content !== "string") {
      return NextResponse.json(
        { success: false, error: "edited_content must be a string." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const { data: proposal, error: fetchError } = await supabase
      .from("proposals")
      .select("id,version")
      .eq("rfp_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json(
        {
          success: false,
          error: fetchError?.message ?? "Proposal not found."
        },
        { status: 404 }
      );
    }

    const nextVersion = (proposal.version ?? 0) + 1;
    const { error: updateError } = await supabase
      .from("proposals")
      .update({
        edited_content: body.edited_content,
        updated_at: new Date().toISOString(),
        version: nextVersion
      })
      .eq("id", proposal.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, version: nextVersion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
