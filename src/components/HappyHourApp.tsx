"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Venue, DayFilter } from "@/lib/types";
import { getTodayKey, DAYS, DAY_LABELS } from "@/lib/types";
import { haversineDistance } from "@/lib/geo";
import Sidebar, { VenueList } from "./Sidebar";
import MapView from "./MapView";
import BottomSheet from "./BottomSheet";

export type GpsState = "idle" | "acquiring" | "located" | "denied";

interface HappyHourAppProps {
  initialVenues: Venue[];
  initialVenueId?: string;
  showDeletedMessage?: boolean;
}

export default function HappyHourApp({ initialVenues, initialVenueId, showDeletedMessage }: HappyHourAppProps) {
  const [activeDay, setActiveDay] = useState<DayFilter>("all");
  const [happeningNow, setHappeningNow] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [deletedBanner, setDeletedBanner] = useState(showDeletedMessage ?? false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<GpsState>("idle");

  const todayKey = getTodayKey();
  const isWeekday = todayKey !== null;

  // Find the portal target in SiteHeader after mount
  useEffect(() => {
    setHeaderSlot(document.getElementById("header-nav-slot"));
  }, []);

  // Pre-select venue from URL param
  useEffect(() => {
    if (!initialVenueId) return;
    const venue = initialVenues.find((v) => String(v.id) === initialVenueId);
    if (venue) {
      setSelectedVenue(venue);
      if (venue.neighborhood) setSelectedNeighborhood(venue.neighborhood);
    }
  }, [initialVenueId, initialVenues]);

  // Auto-dismiss deleted banner
  useEffect(() => {
    if (!deletedBanner) return;
    const t = setTimeout(() => setDeletedBanner(false), 3000);
    return () => clearTimeout(t);
  }, [deletedBanner]);

  // Silent geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState("located");
      },
      () => {
        // Silent fail — user didn't grant permission yet, that's fine
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  // Compute distances from user location
  const venueDistances = useMemo(() => {
    if (!userLocation) return new Map<number, number>();
    const map = new Map<number, number>();
    for (const v of initialVenues) {
      if (v.latitude != null && v.longitude != null) {
        map.set(v.id, haversineDistance(userLocation.lat, userLocation.lng, v.latitude, v.longitude));
      }
    }
    return map;
  }, [initialVenues, userLocation]);

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
    // Sort by distance when user location is available
    if (userLocation) {
      filtered = [...filtered].sort((a, b) => {
        const da = venueDistances.get(a.id) ?? Infinity;
        const db = venueDistances.get(b.id) ?? Infinity;
        return da - db;
      });
    }
    return filtered;
  }, [initialVenues, activeDay, happeningNow, userLocation, venueDistances]);

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
      {/* Deleted banner */}
      {deletedBanner && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-sm text-red-700">
          Deal deleted successfully.
        </div>
      )}
      {/* Portal day filters into the SiteHeader nav slot (desktop) */}
      {headerSlot && createPortal(
        <nav className="hidden md:contents">{dayFilters}</nav>,
        headerSlot
      )}

      {/* Map (full-bleed) + Sidebar overlay */}
      <div className="relative flex-1 min-h-0">
        <MapView
          venues={initialVenues}
          filteredVenues={filteredVenues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onMarkerClick={handleVenueSelect}
          onMapClick={handleMapClick}
          userLocation={userLocation}
          gpsState={gpsState}
          onGpsStateChange={setGpsState}
          onUserLocationChange={setUserLocation}
          venueDistances={venueDistances}
        />
        <Sidebar
          venues={filteredVenues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onVenueSelect={handleVenueSelect}
          onNeighborhoodSelect={handleNeighborhoodSelect}
          isLoading={false}
          venueDistances={venueDistances}
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
        isLocated={gpsState === "located"}
      >
        <VenueList
          venues={filteredVenues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onVenueSelect={handleVenueSelect}
          onNeighborhoodSelect={handleNeighborhoodSelect}
          venueDistances={venueDistances}
        />
      </BottomSheet>
    </div>
  );
}
