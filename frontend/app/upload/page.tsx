"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("rfp-file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an RFP PDF before submitting.");
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      router.push("/proposals");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">Upload RFP</h1>
        <p className="text-slate-600">
          Select a PDF document to queue it for the proposal pipeline.
        </p>
      </div>

      <form
        className="max-w-xl space-y-4 rounded-lg border bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <label htmlFor="rfp-file" className="text-sm font-medium text-slate-700">
            RFP PDF
          </label>
          <Input
            id="rfp-file"
            name="rfp-file"
            type="file"
            accept="application/pdf,.pdf"
            disabled={isUploading}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </form>
    </section>
  );
}
