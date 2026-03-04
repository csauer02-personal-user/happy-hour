"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DayFilter, DAYS, DAY_LABELS, getTodayKey } from "@/lib/types";
import { createClient } from "@/lib/supabase-browser";
import UserMenu from "./UserMenu";

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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

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

          {/* User menu with sign out */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
