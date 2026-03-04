"use client";

import { useEffect, useCallback, memo, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Venue } from "@/lib/types";
import { getTodayKey } from "@/lib/types";
import type { GpsState } from "./HappyHourApp";

const MARKER_COLORS = [
  "#e40303", // red
  "#ff8c00", // orange
  "#ffed00", // yellow
  "#008026", // green
  "#004dff", // blue
  "#750787", // purple
  "#ffffff", // white
  "#ffafc8", // pink
  "#74d7ee", // trans blue
  "#ffda00", // intersex
  "#613915", // PoC brown
];

const ATL_CENTER = { lat: 33.77, lng: -84.39 };

interface MapViewProps {
  venues: Venue[];
  selectedVenue: Venue | null;
  selectedNeighborhood: string | null;
  onMarkerClick: (id: number) => void;
  onMapClick: () => void;
  userLocation: { lat: number; lng: number } | null;
  gpsState: GpsState;
  onGpsStateChange: (state: GpsState) => void;
  onUserLocationChange: (loc: { lat: number; lng: number }) => void;
  venueDistances: Map<number, number>;
}

function getFaviconUrl(restaurantUrl: string | null): string | null {
  if (!restaurantUrl) return null;
  try {
    const hostname = new URL(restaurantUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}

function isActiveToday(venue: Venue): boolean {
  const today = getTodayKey();
  if (!today || today === "all") return false;
  return !!venue[today];
}

function FaviconPin({
  venue,
  color,
  isSelected,
}: {
  venue: Venue;
  color: string;
  isSelected: boolean;
}) {
  const [faviconError, setFaviconError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const faviconUrl = getFaviconUrl(venue.restaurant_url);
  const firstLetter = venue.restaurant_name?.charAt(0)?.toUpperCase() || "?";
  const activeToday = isActiveToday(venue);
  const emoji = venue.category_emoji || "🍽️";
  const highlight = venue.deal_highlight;

  const scale = hovered ? 1.28 : 1;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: `scale(${scale})`,
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        position: "relative",
        width: 56,
        height: 68,
        cursor: "pointer",
      }}
    >
      {/* Main circle body */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: color,
          border: isSelected ? "3px solid #333" : "2px solid rgba(0,0,0,0.15)",
          boxShadow: isSelected
            ? "0 4px 12px rgba(0,0,0,0.35)"
            : "0 2px 6px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "visible",
        }}
      >
        {/* Favicon disc */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {faviconUrl && !faviconError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={faviconUrl}
              alt=""
              width={26}
              height={26}
              style={{ borderRadius: 4 }}
              loading="lazy"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: color === "#ffffff" ? "#750787" : color,
                lineHeight: 1,
              }}
            >
              {firstLetter}
            </span>
          )}
        </div>

        {/* Price chip — top-left */}
        {highlight && (
          <div
            style={{
              position: "absolute",
              top: -6,
              left: -4,
              background: "#1a1a2e",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 5px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              lineHeight: 1.2,
              maxWidth: 72,
              overflow: "hidden",
              textOverflow: "ellipsis",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            {highlight}
          </div>
        )}

        {/* Category emoji badge — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -4,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          {emoji}
        </div>
      </div>

      {/* Pointer triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `10px solid ${color}`,
          margin: "-2px auto 0",
        }}
      />

      {/* Active-today dot — bottom-center */}
      {activeToday && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22c55e",
            border: "1.5px solid white",
            boxShadow: "0 0 4px rgba(34,197,94,0.6)",
          }}
        />
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 4,
            background: "white",
            borderRadius: 12,
            padding: "4px 10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>
            {venue.restaurant_name}
          </span>
          {venue.neighborhood && (
            <span style={{ fontSize: 10, color: "#888", marginLeft: 6 }}>
              {venue.neighborhood}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ME Beacon — user's location marker */
function MeBeacon() {
  return (
    <div style={{ position: "relative", width: 46, height: 60, pointerEvents: "none" }}>
      {/* Radar rings */}
      <div className="me-radar-ring me-radar-ring-1" />
      <div className="me-radar-ring me-radar-ring-2" />

      {/* Main circle */}
      <div
        className="me-beacon-pulse"
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #750787, #ff8c00)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 10px rgba(117,7,135,0.4)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: 22, lineHeight: 1 }}>🙋</span>
      </div>

      {/* ME pill label */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #750787, #ff8c00)",
          color: "white",
          fontSize: 9,
          fontWeight: 800,
          padding: "1px 6px",
          borderRadius: 6,
          letterSpacing: 1,
          zIndex: 2,
        }}
      >
        ME
      </div>
    </div>
  );
}

/* GPS Locate Button */
function GpsButton({
  gpsState,
  onLocate,
}: {
  gpsState: GpsState;
  onLocate: () => void;
}) {
  const isAcquiring = gpsState === "acquiring";

  return (
    <button
      onClick={onLocate}
      disabled={gpsState === "denied"}
      className="group"
      style={{
        position: "absolute",
        bottom: 110,
        right: 10,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        background: "none",
        border: "none",
        cursor: gpsState === "denied" ? "not-allowed" : "pointer",
        opacity: gpsState === "denied" ? 0.4 : 1,
      }}
      title="Locate me"
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: isAcquiring
            ? "linear-gradient(135deg, #750787, #ff8c00)"
            : "white",
          border: isAcquiring ? "none" : "2.5px solid #750787",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          transition: "background 0.3s, border 0.3s",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isAcquiring ? "white" : "#750787"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isAcquiring ? "animate-spin" : ""}
        >
          {/* Crosshair icon */}
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#750787",
          background: "white",
          padding: "1px 6px",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {isAcquiring ? "finding..." : "locate me"}
      </span>
    </button>
  );
}

const MapContent = memo(function MapContent({
  venues,
  selectedVenue,
  selectedNeighborhood,
  onMarkerClick,
  onMapClick,
  userLocation,
  gpsState,
  onGpsStateChange,
  onUserLocationChange,
  venueDistances,
}: MapViewProps) {
  const map = useMap();

  // Zoom to neighborhood when selected WITHOUT a venue — venue panTo takes priority.
  // selectedVenue is intentionally excluded from deps: deselecting a venue should NOT
  // re-trigger fitBounds (acceptance: "deselect venue → map stays at current zoom").
  useEffect(() => {
    if (!map || !selectedNeighborhood || selectedVenue) return;

    const neighborhoodVenues = venues.filter(
      (v) =>
        v.neighborhood === selectedNeighborhood &&
        v.latitude != null &&
        v.longitude != null
    );
    if (neighborhoodVenues.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const v of neighborhoodVenues) {
      bounds.extend({ lat: v.latitude!, lng: v.longitude! });
    }
    map.fitBounds(bounds, { top: 80, bottom: 20, left: 20, right: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedNeighborhood, venues]);

  // Center on selected venue
  useEffect(() => {
    if (!map || !selectedVenue?.latitude || !selectedVenue?.longitude) return;
    map.panTo({ lat: selectedVenue.latitude, lng: selectedVenue.longitude });
  }, [map, selectedVenue]);

  // Animate to user location when GPS acquires
  useEffect(() => {
    if (!map || !userLocation || gpsState !== "located") return;
    map.panTo(userLocation);
    map.setZoom(14);
    // Only run on initial location acquisition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, gpsState === "located"]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    onGpsStateChange("acquiring");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onUserLocationChange(loc);
        onGpsStateChange("located");
      },
      () => {
        onGpsStateChange("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [onGpsStateChange, onUserLocationChange]);

  const mappableVenues = venues.filter(
    (v) => v.latitude != null && v.longitude != null
  );

  return (
    <>
      {mappableVenues.map((venue) => {
        const isSelected = selectedVenue?.id === venue.id;
        const color = MARKER_COLORS[venue.id % MARKER_COLORS.length];

        // Closer venues get higher z-index when distance sorting active
        const dist = venueDistances.get(venue.id);
        const distanceZIndex = dist != null ? Math.max(1, Math.round(100 - dist)) : 1;
        const zIndex = isSelected ? 1000 : distanceZIndex;

        return (
          <AdvancedMarker
            key={venue.id}
            position={{ lat: venue.latitude!, lng: venue.longitude! }}
            onClick={() => onMarkerClick(venue.id)}
            zIndex={zIndex}
          >
            <FaviconPin venue={venue} color={color} isSelected={isSelected} />
          </AdvancedMarker>
        );
      })}

      {/* ME Beacon */}
      {userLocation && (
        <AdvancedMarker
          position={userLocation}
          zIndex={999}
        >
          <MeBeacon />
        </AdvancedMarker>
      )}

      {/* GPS Button */}
      <GpsButton gpsState={gpsState} onLocate={handleLocate} />
    </>
  );
});

export default function MapView(props: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleMapClick = useCallback(() => {
    props.onMapClick();
  }, [props.onMapClick]);

  if (!apiKey) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center p-4">
          <div className="text-2xl mb-2">🗺️</div>
          <p className="text-gray-500 text-sm">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={ATL_CENTER}
          defaultZoom={12}
          mapId="happyhour-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          onClick={handleMapClick}
          className="w-full h-full"
        >
          <MapContent {...props} />
        </Map>
      </APIProvider>
    </div>
  );
}
