import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/ui/navbar";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"]
});

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
    <html lang="en" className={sora.variable}>
      <body>
        <div className="min-h-screen bg-background">
          {/* ─── Dynamic Navigation ─── */}
          <Navbar />

          {/* ─── Main Content ─── */}
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
        <Toaster
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: "hsl(222, 47%, 8%)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "hsl(210, 40%, 96%)"
            }
          }}
        />
      </body>
    </html>
  );
}
