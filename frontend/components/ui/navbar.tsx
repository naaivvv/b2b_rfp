"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();

  // Hide navbar on the landing page
  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20 transition-shadow group-hover:shadow-indigo-500/40">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M2 4.5A2.5 2.5 0 014.5 2h7A2.5 2.5 0 0114 4.5v1a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-1z"
                fill="rgba(255,255,255,0.9)"
              />
              <path
                d="M2 7.5a.5.5 0 01.5-.5h11a.5.5 0 01.5.5v4A2.5 2.5 0 0111.5 14h-7A2.5 2.5 0 012 11.5v-4z"
                fill="rgba(255,255,255,0.55)"
              />
              <rect x="4.5" y="9" width="7" height="1.25" rx="0.625" fill="rgba(255,255,255,0.8)" />
              <rect x="4.5" y="11" width="4.5" height="1.25" rx="0.625" fill="rgba(255,255,255,0.5)" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-100 tracking-tight">
            RFP Architect
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          <NavLink href="/upload">Upload</NavLink>
          <NavLink href="/proposals">Proposals</NavLink>
        </div>
      </nav>
    </header>
  );
}
