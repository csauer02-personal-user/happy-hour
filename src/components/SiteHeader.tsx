"use client";

import Link from "next/link";
import UserMenu from "./UserMenu";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 shrink-0">
      <div className="rainbow-bar" />
      <div className="bg-brand-gradient px-3 py-1.5">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-base font-bold text-white tracking-tight shrink-0"
          >
            ATL Happy Hour
          </Link>

          {/* Portal slot: pages can inject nav content here (e.g. day filters) */}
          <div
            id="header-nav-slot"
            className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide"
          />

          <Link
            href="/deal-updater"
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-brand-yellow text-brand-purple hover:scale-105 transition-transform shadow-md"
          >
            <span>+</span>
            <span className="hidden sm:inline">Add Deal</span>
          </Link>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
