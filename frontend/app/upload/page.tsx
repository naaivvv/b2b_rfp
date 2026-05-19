"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";

type UploadStage = "select" | "uploading" | "success";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stage, setStage] = useState<UploadStage>("select");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  }, []);

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }

  function removeFile() {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError("Choose an RFP PDF before submitting.");
      return;
    }

    setStage("uploading");
    setProgress(0);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("rfp-file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      clearInterval(progressInterval);

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      setProgress(100);
      setStage("success");

      setTimeout(() => {
        router.push("/proposals");
        router.refresh();
      }, 1500);
    } catch (uploadError) {
      clearInterval(progressInterval);
      setStage("select");
      setProgress(0);
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed."
      );
    }
  }

  return (
    <section className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
          Upload RFP
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xl">
          Drop a PDF document to queue it for the autonomous proposal pipeline.
          Our agents will extract requirements, retrieve knowledge, and draft your response.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="mb-8 flex items-center gap-3">
        {[
          { step: 1, label: "Select file", active: stage === "select" },
          { step: 2, label: "Upload", active: stage === "uploading" },
          { step: 3, label: "Processing", active: stage === "success" }
        ].map(({ step, label, active }, index) => (
          <div key={step} className="flex items-center gap-3">
            {index > 0 && (
              <div className={`h-px w-8 transition-colors duration-300 ${
                (stage === "uploading" && step <= 2) || (stage === "success")
                  ? "bg-indigo-500"
                  : "bg-white/10"
              }`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                    : (stage === "uploading" && step < 2) || (stage === "success" && step < 3)
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/[0.06] text-slate-500"
                }`}
              >
                {((stage === "uploading" && step < 2) || (stage === "success" && step <= 3 && step < 3)) ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : stage === "success" && step === 3 ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  active ? "text-slate-100" : "text-slate-500"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Card */}
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="glass-card rounded-xl p-1">
          <div className="rounded-[10px] bg-white/[0.02] p-6">
            {/* Success State */}
            {stage === "success" ? (
              <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 animate-check-pop">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-100">
                  Upload complete
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Redirecting to proposals dashboard...
                </p>
              </div>
            ) : (
              <>
                {/* Drag & Drop Zone */}
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all duration-300 cursor-pointer ${
                    isDragOver
                      ? "border-indigo-400 bg-indigo-500/[0.06] shadow-[inset_0_0_30px_rgba(99,102,241,0.06)]"
                      : selectedFile
                        ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                        : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleInputChange}
                    className="hidden"
                    id="rfp-file"
                    name="rfp-file"
                    disabled={stage === "uploading"}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center animate-fade-in">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
                        <FileText className="h-6 w-6 text-indigo-400" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-100">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="mt-3 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
                        isDragOver
                          ? "bg-indigo-500/15 scale-110"
                          : "bg-white/[0.04]"
                      }`}>
                        <UploadCloud
                          className={`h-7 w-7 transition-all duration-300 ${
                            isDragOver
                              ? "text-indigo-400 animate-float"
                              : "text-slate-500"
                          }`}
                        />
                      </div>
                      <p className="mt-4 text-sm font-medium text-slate-200">
                        {isDragOver ? "Drop your PDF here" : "Drag & drop your RFP PDF"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        or click to browse · PDF up to 50 MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload Progress */}
                {stage === "uploading" && (
                  <div className="mt-5 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                      </span>
                      <span className="text-xs font-medium text-indigo-300">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error ? (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 animate-fade-in">
                    <X className="h-4 w-4 flex-none" />
                    {error}
                  </div>
                ) : null}

                {/* Submit Button */}
                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={!selectedFile || stage === "uploading"}
                    className="w-full h-11"
                  >
                    {stage === "uploading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Upload & Process
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
