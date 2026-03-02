"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Venue } from "@/lib/types";
import VenueCard from "./VenueCard";

interface SidebarProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  selectedNeighborhood: string | null;
  onVenueSelect: (id: number | null) => void;
  onNeighborhoodSelect: (neighborhood: string | null) => void;
  isLoading: boolean;
}

export default function Sidebar({
  venues,
  selectedVenue,
  selectedNeighborhood,
  onVenueSelect,
  onNeighborhoodSelect,
  isLoading,
}: SidebarProps) {
  const [expandedNeighborhoods, setExpandedNeighborhoods] = useState<
    Set<string>
  >(new Set());
  const selectedRef = useRef<HTMLDivElement>(null);

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

  // Expand neighborhood when venue or neighborhood is selected
  useEffect(() => {
    if (selectedVenue) {
      setExpandedNeighborhoods((prev) => {
        const next = new Set(prev);
        next.add(selectedVenue.neighborhood);
        return next;
      });
    }
  }, [selectedVenue]);

  useEffect(() => {
    if (selectedNeighborhood) {
      setExpandedNeighborhoods((prev) => {
        const next = new Set(prev);
        next.add(selectedNeighborhood);
        return next;
      });
    }
  }, [selectedNeighborhood]);

  // Scroll to selected venue
  useEffect(() => {
    if (selectedVenue && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedVenue]);

  const toggleNeighborhood = (neighborhood: string) => {
    setExpandedNeighborhoods((prev) => {
      const next = new Set(prev);
      if (next.has(neighborhood)) {
        next.delete(neighborhood);
        if (selectedNeighborhood === neighborhood) {
          onNeighborhoodSelect(null);
        }
      } else {
        next.add(neighborhood);
        onNeighborhoodSelect(neighborhood);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <aside className="w-full max-h-[40vh] md:max-h-none md:w-72 lg:w-80 shrink-0 bg-gray-50 border-r border-gray-200 overflow-hidden">
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
    <aside className="w-full max-h-[40vh] md:max-h-none md:w-72 lg:w-80 shrink-0 bg-gray-50 border-r border-gray-200 md:border-b-0 border-b flex flex-col overflow-hidden">
      <div className="px-3 py-1 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <p className="text-xs text-gray-500 font-medium">
          {venues.length} venue{venues.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {grouped.map(([neighborhood, venueList]) => {
          const isExpanded = expandedNeighborhoods.has(neighborhood);
          const isSelected = selectedNeighborhood === neighborhood;

          return (
            <div key={neighborhood}>
              <button
                onClick={() => toggleNeighborhood(neighborhood)}
                className={`neighborhood-header w-full text-left ${
                  isSelected
                    ? "bg-brand-purple/5 border-l-4 border-brand-purple"
                    : "border-l-4 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {neighborhood}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
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
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
