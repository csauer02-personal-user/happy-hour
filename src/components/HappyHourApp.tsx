"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Venue, DayFilter } from "@/lib/types";
import { getTodayKey } from "@/lib/types";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MapView from "./MapView";
import Footer from "./Footer";

interface HappyHourAppProps {
  initialVenues: Venue[];
}

export default function HappyHourApp({ initialVenues }: HappyHourAppProps) {
  const [activeDay, setActiveDay] = useState<DayFilter>("all");
  const [happeningNow, setHappeningNow] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<
    string | null
  >(null);

  // Filter venues by day
  const filteredVenues = useMemo(() => {
    let filtered = initialVenues;

    if (activeDay !== "all") {
      filtered = filtered.filter(
        (v) => v[activeDay as keyof Pick<Venue, "mon" | "tue" | "wed" | "thu" | "fri">]
      );
    }

    if (happeningNow) {
      const todayKey = getTodayKey();
      if (todayKey) {
        filtered = filtered.filter(
          (v) => v[todayKey as keyof Pick<Venue, "mon" | "tue" | "wed" | "thu" | "fri">]
        );
      }
    }

    return filtered;
  }, [initialVenues, activeDay, happeningNow]);

  const handleDayChange = useCallback(
    (day: DayFilter) => {
      if (day === "all" && happeningNow) {
        setHappeningNow(false);
      }

      if (day === activeDay && day !== "all") {
        setActiveDay("all");
        if (happeningNow) setHappeningNow(false);
      } else {
        setActiveDay(day);

        const todayKey = getTodayKey();
        if (day === todayKey && !happeningNow) {
          setHappeningNow(true);
        } else if (day !== "all" && day !== todayKey && happeningNow) {
          setHappeningNow(false);
        }
      }
    },
    [activeDay, happeningNow]
  );

  const handleHappeningNowToggle = useCallback(() => {
    const newState = !happeningNow;
    setHappeningNow(newState);

    if (newState) {
      const todayKey = getTodayKey();
      if (todayKey && activeDay !== todayKey) {
        setActiveDay(todayKey);
      }
    } else {
      setActiveDay("all");
    }
  }, [happeningNow, activeDay]);

  const handleVenueSelect = useCallback(
    (id: number | null) => {
      if (id === null) {
        setSelectedVenue(null);
        return;
      }

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
      if (neighborhood === null && selectedVenue) {
        setSelectedVenue(null);
      }
      setSelectedNeighborhood(neighborhood);
    },
    [selectedVenue]
  );

  const handleMapClick = useCallback(() => {
    setSelectedVenue(null);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header
        activeDay={activeDay}
        happeningNow={happeningNow}
        onDayChange={handleDayChange}
        onHappeningNowToggle={handleHappeningNowToggle}
      />

      {/* Main content area below fixed header */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ marginTop: "calc(var(--header-height) + 3px)" }}
      >
        {/* Mobile: stacked (sidebar top, map bottom); Desktop: side by side */}
        <div className="flex flex-col md:flex-row w-full h-full">
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
      </div>

      <Footer />
    </div>
  );
}
