export default function ProposalsPage() {
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

      <div className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">
        No proposals yet
      </div>
    </section>
  );
}
