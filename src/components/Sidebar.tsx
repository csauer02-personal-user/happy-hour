"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Venue } from "@/lib/types";
import VenueCard from "./VenueCard";

interface SidebarProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  selectedNeighborhood: string | null;
  onVenueSelect: (id: number | null) => void;
  onNeighborhoodSelect: (neighborhood: string | null) => void;
  isLoading: boolean;
  venueDistances?: Map<number, number>;
}

// Extracted venue list content — reused in both Sidebar and BottomSheet
export function VenueList({
  venues,
  selectedVenue,
  selectedNeighborhood,
  onVenueSelect,
  onNeighborhoodSelect,
  venueDistances,
}: Omit<SidebarProps, "isLoading">) {
  const [openNeighborhood, setOpenNeighborhood] = useState<string | null>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setHeaderRef = useCallback((neighborhood: string, el: HTMLButtonElement | null) => {
    if (el) headerRefs.current.set(neighborhood, el);
    else headerRefs.current.delete(neighborhood);
  }, []);

  // Group venues by neighborhood
  const grouped = useMemo(() => {
    const groups: Record<string, Venue[]> = {};
    for (const v of venues) {
      const key = v.neighborhood || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }
    return Object.entries(groups).sort(([a], [b]) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [venues]);

  // Scroll header to top of scroll container
  const scrollHeaderToTop = useCallback((neighborhood: string) => {
    setTimeout(() => {
      const el = headerRefs.current.get(neighborhood);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, []);

  // Open neighborhood when neighborhood header is selected externally
  useEffect(() => {
    if (selectedNeighborhood) {
      setOpenNeighborhood(selectedNeighborhood);
      scrollHeaderToTop(selectedNeighborhood);
    }
  }, [selectedNeighborhood, scrollHeaderToTop]);

  // Open neighborhood AND scroll to card when venue is selected
  // Delays scroll to wait for: (1) neighborhood DOM expansion, (2) BottomSheet height transition
  useEffect(() => {
    if (!selectedVenue) return;

    setOpenNeighborhood(selectedVenue.neighborhood);

    // 350ms covers the BottomSheet's 300ms CSS transition + DOM expansion
    const timer = setTimeout(() => {
      if (selectedRef.current) {
        selectedRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedVenue]);

  const toggleNeighborhood = (neighborhood: string) => {
    if (openNeighborhood === neighborhood) {
      // Close the open neighborhood
      setOpenNeighborhood(null);
      if (selectedNeighborhood === neighborhood) {
        onNeighborhoodSelect(null);
      }
    } else {
      // Open this neighborhood (auto-closes previous)
      setOpenNeighborhood(neighborhood);
      onNeighborhoodSelect(neighborhood);
      scrollHeaderToTop(neighborhood);
    }
  };

  return (
    <>
      {grouped.map(([neighborhood, venueList]) => {
        const isExpanded = openNeighborhood === neighborhood;
        const isSelected = selectedNeighborhood === neighborhood;

        return (
          <div key={neighborhood}>
            <button
              ref={(el) => setHeaderRef(neighborhood, el)}
              onClick={() => toggleNeighborhood(neighborhood)}
              className={`neighborhood-header w-full text-left ${
                isSelected
                  ? "bg-brand-purple/5 border-l-4 border-brand-purple"
                  : "border-l-4 border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800 text-sm">
                  {neighborhood}
                </span>
                <span className="text-[10px] text-gray-400 bg-gray-200 rounded-full px-1.5 py-0.5">
                  {venueList.length}
                </span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-2 py-1 space-y-1">
                {venueList.map((venue) => (
                  <div
                    key={venue.id}
                    ref={
                      selectedVenue?.id === venue.id ? selectedRef : undefined
                    }
                  >
                    <VenueCard
                      venue={venue}
                      isSelected={selectedVenue?.id === venue.id}
                      onSelect={onVenueSelect}
                      distance={venueDistances?.get(venue.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Desktop sidebar — hidden on mobile (bottom sheet used instead)
export default function Sidebar({
  venues,
  selectedVenue,
  selectedNeighborhood,
  onVenueSelect,
  onNeighborhoodSelect,
  isLoading,
  venueDistances,
}: SidebarProps) {
  if (isLoading) {
    return (
      <aside className="hidden md:flex absolute top-0 left-0 bottom-0 z-10 w-72 lg:w-80 bg-gray-50/85 backdrop-blur-md border-r border-gray-200/50 overflow-hidden flex-col shadow-lg">
        <div className="p-2 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="space-y-2">
                <div className="h-20 bg-gray-200 rounded-xl" />
                <div className="h-20 bg-gray-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex absolute top-0 left-0 bottom-0 z-10 w-72 lg:w-80 bg-gray-50/85 backdrop-blur-md border-r border-gray-200/50 flex-col overflow-hidden shadow-lg">
      <div className="px-3 py-1 border-b border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <p className="text-xs text-gray-500 font-medium">
          {venues.length} venue{venues.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll">
        <VenueList
          venues={venues}
          selectedVenue={selectedVenue}
          selectedNeighborhood={selectedNeighborhood}
          onVenueSelect={onVenueSelect}
          onNeighborhoodSelect={onNeighborhoodSelect}
          venueDistances={venueDistances}
        />
      </div>
    </aside>
  );
}
