import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UploadPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">Upload RFP</h1>
        <p className="text-slate-600">
          Select a PDF document to queue it for the proposal pipeline.
        </p>
      </div>

      <form className="max-w-xl space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <label htmlFor="rfp-file" className="text-sm font-medium text-slate-700">
            RFP PDF
          </label>
          <Input id="rfp-file" name="rfp-file" type="file" accept="application/pdf,.pdf" />
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </section>
  );
}
