import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Phase 1
        </p>
        <h1 className="text-3xl font-semibold text-slate-950">
          Autonomous B2B RFP Response Architect
        </h1>
        <p className="max-w-2xl text-slate-600">
          Upload RFP documents, track generated proposals, and prepare for the
          agentic review workflow.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/upload">Upload RFP</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/proposals">View Proposals</Link>
        </Button>
      </div>
    </section>
  );
}
