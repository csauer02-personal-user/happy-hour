"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { DayFilter, DAYS, DAY_LABELS, getTodayKey } from "@/lib/types";

type SnapPoint = "peek" | "half" | "full";

interface BottomSheetProps {
  children: React.ReactNode;
  venueCount: number;
  activeDay: DayFilter;
  happeningNow: boolean;
  onDayChange: (day: DayFilter) => void;
  onHappeningNowToggle: () => void;
  selectedVenueId: number | null;
  isLocated?: boolean;
}

export default function BottomSheet({
  children,
  venueCount,
  activeDay,
  happeningNow,
  onDayChange,
  onHappeningNowToggle,
  selectedVenueId,
  isLocated,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<SnapPoint>("half");
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const todayKey = getTodayKey();
  const isWeekday = todayKey !== null;

  const touchState = useRef({
    startY: 0,
    startHeight: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    isDragging: false, // true only after exceeding drag threshold
  });

  const getSnapHeight = useCallback((point: SnapPoint) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    if (point === "peek") return 100;
    if (point === "half") return vh * 0.5;
    return vh * 0.85;
  }, []);

  const currentHeight = dragging ? dragOffset : getSnapHeight(snap);

  // Auto-expand when a venue is selected on the map
  useEffect(() => {
    if (selectedVenueId != null && snap === "peek") {
      setSnap("half");
    }
  }, [selectedVenueId, snap]);

  // Minimum px movement before a touch becomes a drag (allows taps through)
  const DRAG_THRESHOLD = 10;

  const handleHandleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchState.current = {
        startY: touch.clientY,
        startHeight: getSnapHeight(snap),
        lastY: touch.clientY,
        lastTime: Date.now(),
        velocity: 0,
        isDragging: false,
      };
      // Don't set dragging yet — wait for threshold in touchmove
    },
    [snap, getSnapHeight]
  );

  const handleHandleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();
      const dt = now - touchState.current.lastTime;
      const dy = touchState.current.lastY - touch.clientY;
      if (dt > 0) touchState.current.velocity = dy / dt;
      touchState.current.lastY = touch.clientY;
      touchState.current.lastTime = now;

      const delta = touchState.current.startY - touch.clientY;

      // Only activate drag after exceeding threshold
      if (!touchState.current.isDragging) {
        if (Math.abs(delta) < DRAG_THRESHOLD) return;
        touchState.current.isDragging = true;
        setDragging(true);
      }

      const maxH = typeof window !== "undefined" ? window.innerHeight * 0.92 : 700;
      const newHeight = Math.max(60, Math.min(maxH, touchState.current.startHeight + delta));
      setDragOffset(newHeight);
    },
    []
  );

  const handleHandleTouchEnd = useCallback(() => {
    if (!touchState.current.isDragging) {
      // Touch didn't exceed threshold — it was a tap, not a drag
      return;
    }
    setDragging(false);
    touchState.current.isDragging = false;
    const v = touchState.current.velocity;
    const h = dragOffset;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    if (Math.abs(v) > 0.5) {
      if (v > 0) setSnap(h > vh * 0.4 ? "full" : "half");
      else setSnap("half"); // Never snap below half
    } else {
      const halfH = getSnapHeight("half");
      const fullH = getSnapHeight("full");
      const dHalf = Math.abs(h - halfH);
      const dFull = Math.abs(h - fullH);
      if (dFull < dHalf) setSnap("full");
      else setSnap("half"); // Never snap below half
    }
  }, [dragOffset, getSnapHeight]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        height: `${currentHeight}px`,
        transition: dragging ? "none" : "height 0.3s ease-out",
      }}
    >
      <div className="h-full bg-gray-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* Handle + Day Filters */}
        <div
          data-sheet-handle
          className="shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={handleHandleTouchStart}
          onTouchMove={handleHandleTouchMove}
          onTouchEnd={handleHandleTouchEnd}
        >
          {/* Drag pill */}
          <div className="pt-2 pb-1 flex justify-center">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Day filter strip */}
          <div className="px-2 pb-1.5 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 w-max">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => onDayChange(day)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap min-h-[32px] ${
                    activeDay === day
                      ? "bg-brand-purple text-white shadow-sm"
                      : "bg-gray-200/80 text-gray-600 hover:bg-gray-300/80"
                  }`}
                >
                  {DAY_LABELS[day].short}
                </button>
              ))}
              {isWeekday && (
                <button
                  onClick={onHappeningNowToggle}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap min-h-[32px] flex items-center gap-1 ${
                    happeningNow
                      ? "bg-brand-yellow text-brand-purple font-bold shadow-sm"
                      : "bg-gray-200/80 text-gray-600 hover:bg-gray-300/80"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${happeningNow ? "bg-brand-purple animate-pulse" : "bg-gray-400"}`} />
                  Now
                </button>
              )}
              <span className="text-[10px] text-gray-400 pl-1 whitespace-nowrap">
                {venueCount} {isLocated ? `deal${venueCount !== 1 ? "s" : ""} near you` : `spot${venueCount !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable venue list */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto sidebar-scroll"
          style={{ touchAction: "pan-y" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
