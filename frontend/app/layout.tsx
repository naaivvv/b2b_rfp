import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "RFP Response Architect",
  description: "Autonomous B2B RFP response dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50">
          <header className="border-b bg-white">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-sm font-semibold text-slate-950">
                RFP Response Architect
              </Link>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <Link href="/upload" className="hover:text-slate-950">
                  Upload
                </Link>
                <Link href="/proposals" className="hover:text-slate-950">
                  Proposals
                </Link>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </div>
        <Toaster richColors />
      </body>
    </html>
  );
}
