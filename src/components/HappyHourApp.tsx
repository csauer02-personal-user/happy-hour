"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Venue, DayFilter } from "@/lib/types";
import { getTodayKey, DAYS, DAY_LABELS } from "@/lib/types";
import Sidebar, { VenueList } from "./Sidebar";
import MapView from "./MapView";
import BottomSheet from "./BottomSheet";

interface HappyHourAppProps {
  initialVenues: Venue[];
}

export default function HappyHourApp({ initialVenues }: HappyHourAppProps) {
  const [activeDay, setActiveDay] = useState<DayFilter>("all");
  const [happeningNow, setHappeningNow] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);

  const todayKey = getTodayKey();
  const isWeekday = todayKey !== null;

  // Find the portal target in SiteHeader after mount
  useEffect(() => {
    setHeaderSlot(document.getElementById("header-nav-slot"));
  }, []);

  const filteredVenues = useMemo(() => {
    let filtered = initialVenues;
    if (activeDay !== "all") {
      filtered = filtered.filter(
        (v) => v[activeDay as keyof Pick<Venue, "mon" | "tue" | "wed" | "thu" | "fri">]
      );
    }
    if (happeningNow) {
      const today = getTodayKey();
      if (today) {
        filtered = filtered.filter(
          (v) => v[today as keyof Pick<Venue, "mon" | "tue" | "wed" | "thu" | "fri">]
        );
      }
    }
    return filtered;
  }, [initialVenues, activeDay, happeningNow]);

  const handleDayChange = useCallback(
    (day: DayFilter) => {
      if (day === "all" && happeningNow) setHappeningNow(false);
      if (day === activeDay && day !== "all") {
        setActiveDay("all");
        if (happeningNow) setHappeningNow(false);
      } else {
        setActiveDay(day);
        const today = getTodayKey();
        if (day === today && !happeningNow) setHappeningNow(true);
        else if (day !== "all" && day !== today && happeningNow) setHappeningNow(false);
      }
    },
    [activeDay, happeningNow]
  );

  const handleHappeningNowToggle = useCallback(() => {
    const newState = !happeningNow;
    setHappeningNow(newState);
    if (newState) {
      const today = getTodayKey();
      if (today && activeDay !== today) setActiveDay(today);
    } else {
      setActiveDay("all");
    }
  }, [happeningNow, activeDay]);

  const handleVenueSelect = useCallback(
    (id: number | null) => {
      if (id === null) { setSelectedVenue(null); return; }
      const venue = initialVenues.find((v) => v.id === id) ?? null;
      setSelectedVenue(venue);
      if (venue?.neighborhood && venue.neighborhood !== selectedNeighborhood) {
        setSelectedNeighborhood(venue.neighborhood);
      }
    },
    [initialVenues, selectedNeighborhood]
  );

  const handleNeighborhoodSelect = useCallback(
    (neighborhood: string | null) => {
      if (neighborhood === null && selectedVenue) setSelectedVenue(null);
      setSelectedNeighborhood(neighborhood);
    },
    [selectedVenue]
  );

  const handleMapClick = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  // Day filter buttons — portaled into SiteHeader on desktop, in BottomSheet on mobile
  const dayFilters = (
    <>
      {DAYS.map((day) => (
        <button
          key={day}
          onClick={() => handleDayChange(day)}
          className={`btn-day whitespace-nowrap ${activeDay === day ? "btn-day-active" : ""}`}
          aria-pressed={activeDay === day}
        >
          {DAY_LABELS[day].short}
        </button>
      ))}
      {isWeekday && (
        <button
          onClick={handleHappeningNowToggle}
          className={`btn-day whitespace-nowrap ${happeningNow ? "btn-day-active" : ""}`}
          aria-pressed={happeningNow}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${happeningNow ? "bg-brand-purple animate-pulse" : "bg-white/60"}`} />
          Now
        </button>
      )}
    </>
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Portal day filters into the SiteHeader nav slot (desktop) */}
      {headerSlot && createPortal(
        <nav className="hidden md:contents">{dayFilters}</nav>,
        headerSlot
      )}

      {/* Map + Sidebar */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          venues={filteredVenues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onVenueSelect={handleVenueSelect}
          onNeighborhoodSelect={handleNeighborhoodSelect}
          isLoading={false}
        />
        <MapView
          venues={initialVenues}
          filteredVenues={filteredVenues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onMarkerClick={(id) => handleVenueSelect(id)}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Mobile bottom sheet with day filters */}
      <BottomSheet
        venueCount={filteredVenues.length}
        activeDay={activeDay}
        happeningNow={happeningNow}
        onDayChange={handleDayChange}
        onHappeningNowToggle={handleHappeningNowToggle}
        selectedVenueId={selectedVenue?.id ?? null}
      >
        <VenueList
          venues={filteredVenues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onVenueSelect={handleVenueSelect}
          onNeighborhoodSelect={handleNeighborhoodSelect}
        />
      </BottomSheet>
    </div>
  );
}
