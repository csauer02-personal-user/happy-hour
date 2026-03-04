"use client";

import { useState } from "react";
import Link from "next/link";
import type { Venue } from "@/lib/types";

interface VenueCardProps {
  venue: Venue;
  isSelected: boolean;
  onSelect: (id: number) => void;
  distance?: number;
}

export default function VenueCard({
  venue,
  isSelected,
  onSelect,
  distance,
}: VenueCardProps) {
  const [faviconError, setFaviconError] = useState(false);

  let faviconUrl: string | null = null;
  if (venue.restaurant_url) {
    try {
      const hostname = new URL(venue.restaurant_url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
    } catch {
      // invalid URL, skip favicon
    }
  }

  const firstLetter = venue.restaurant_name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div
      onClick={() => onSelect(venue.id)}
      className={`venue-card ${isSelected ? "venue-card-selected" : ""}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(venue.id);
        }
      }}
      aria-selected={isSelected}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-brand-purple truncate">
            {venue.restaurant_name}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
            {venue.deal}
          </p>
          {distance != null && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {distance < 0.1 ? "nearby" : `${distance.toFixed(1)} mi away`}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-6 h-6 bg-white rounded shadow-sm flex items-center justify-center">
            {faviconUrl && !faviconError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={faviconUrl}
                alt=""
                width={16}
                height={16}
                className="rounded-sm"
                loading="lazy"
                onError={() => setFaviconError(true)}
              />
            ) : (
              <span className="text-[10px] font-bold text-brand-purple/70 leading-none">
                {firstLetter}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Link
              href={`/deal-updater?venueId=${venue.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-brand-purple/60 hover:text-brand-purple transition-colors"
              title="Edit deal"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </Link>
            {venue.restaurant_url && (
              <a
                href={venue.restaurant_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-brand-purple/60 hover:text-brand-purple transition-colors"
                title="Website"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </a>
            )}
            {venue.maps_url && (
              <a
                href={venue.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-brand-purple/60 hover:text-brand-purple transition-colors"
                title="Directions"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
