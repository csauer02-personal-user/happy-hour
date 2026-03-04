"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DayFilter, DAYS, DAY_LABELS, getTodayKey } from "@/lib/types";
import { createClient } from "@/lib/supabase-browser";

interface HeaderProps {
  activeDay: DayFilter;
  happeningNow: boolean;
  onDayChange: (day: DayFilter) => void;
  onHappeningNowToggle: () => void;
}

export default function Header({
  activeDay,
  happeningNow,
  onDayChange,
  onHappeningNowToggle,
}: HeaderProps) {
  const todayKey = getTodayKey();
  const isWeekday = todayKey !== null;
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", user.id).single();
        setIsAdmin(profile?.role === "admin");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email ?? null);
          const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", session.user.id).single();
          setIsAdmin(profile?.role === "admin");
        } else {
          setUserEmail(null);
          setIsAdmin(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setUserEmail(null);
    setIsAdmin(false);
    setMenuOpen(false);
    // POST to server route so cookies are cleared server-side
    await fetch("/api/auth/signout", { method: "POST", redirect: "manual" });
    router.push("/");
    router.refresh();
  };

  // Desktop-only header — hidden on mobile (bottom sheet has the day filters)
  return (
    <header className="hidden md:block fixed top-0 left-0 right-0 z-50">
      <div className="rainbow-bar" />
      <div className="bg-brand-gradient px-3 py-1.5">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-3">
          <span className="text-base font-bold text-white tracking-tight shrink-0">
            ATL Happy Hour
          </span>

          {/* Day Filters */}
          <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => onDayChange(day)}
                className={`btn-day whitespace-nowrap ${activeDay === day ? "btn-day-active" : ""}`}
                aria-pressed={activeDay === day}
              >
                {DAY_LABELS[day].short}
              </button>
            ))}
            {isWeekday && (
              <button
                onClick={onHappeningNowToggle}
                className={`btn-day whitespace-nowrap ${happeningNow ? "btn-day-active" : ""}`}
                aria-pressed={happeningNow}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${happeningNow ? "bg-brand-purple animate-pulse" : "bg-white/60"}`} />
                Now
              </button>
            )}
          </nav>

          {/* Always-visible Deal Updater link */}
          <Link
            href={userEmail ? "/deal-updater" : "/login"}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-brand-yellow text-brand-purple hover:scale-105 transition-transform shadow-md"
          >
            <span>+</span>
            <span className="hidden lg:inline">Add Deal</span>
          </Link>

          {/* Overflow menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full text-white/80 hover:bg-white/20 transition-colors"
              aria-label="Menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                {userEmail ? (
                  <>
                    <div className="px-3 py-1.5 border-b border-gray-100">
                      <p className="text-[10px] text-gray-400 truncate">{userEmail}</p>
                    </div>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Admin
                      </Link>
                    )}
                    <button onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
