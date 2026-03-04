import http from "node:http";
import type { Venue } from "../src/lib/types";

/** Mock venue data served by the fake Supabase PostgREST server */
export const MOCK_VENUES: Venue[] = [
  {
    id: 1,
    restaurant_name: "The Midtown Tap",
    deal: "Half-price drafts and $5 wells 4-7pm",
    neighborhood: "Midtown",
    latitude: 33.7866,
    longitude: -84.3836,
    restaurant_url: "https://midtowntap.example.com",
    maps_url: "https://maps.google.com/?q=midtown+tap",
    mon: true, tue: true, wed: false, thu: true, fri: true,
  },
  {
    id: 2,
    restaurant_name: "Buckhead Bites",
    deal: "BOGO cocktails and $3 sliders",
    neighborhood: "Buckhead",
    latitude: 33.8389,
    longitude: -84.3794,
    restaurant_url: "https://buckheadbites.example.com",
    maps_url: "https://maps.google.com/?q=buckhead+bites",
    mon: false, tue: true, wed: true, thu: false, fri: true,
  },
  {
    id: 3,
    restaurant_name: "Decatur Den",
    deal: "$4 craft pints all night",
    neighborhood: "Decatur",
    latitude: 33.7748,
    longitude: -84.2963,
    restaurant_url: "https://decaturden.example.com",
    maps_url: "https://maps.google.com/?q=decatur+den",
    mon: true, tue: false, wed: true, thu: true, fri: false,
  },
  {
    id: 4,
    restaurant_name: "Old Fourth Grill",
    deal: "Happy hour wings $0.50 each",
    neighborhood: "Old Fourth Ward",
    latitude: 33.7676,
    longitude: -84.3625,
    restaurant_url: "https://o4grill.example.com",
    maps_url: "https://maps.google.com/?q=old+fourth+grill",
    mon: true, tue: true, wed: true, thu: true, fri: true,
  },
  {
    id: 5,
    restaurant_name: "Midtown Sushi",
    deal: "Half-price rolls and sake 5-7pm",
    neighborhood: "Midtown",
    latitude: 33.7835,
    longitude: -84.3855,
    restaurant_url: "https://midtownsushi.example.com",
    maps_url: null,
    mon: false, tue: false, wed: true, thu: true, fri: true,
  },
  {
    id: 6,
    restaurant_name: "Buckhead Brewery",
    deal: "$2 off all house brews",
    neighborhood: "Buckhead",
    latitude: 33.8402,
    longitude: -84.3818,
    restaurant_url: null,
    maps_url: "https://maps.google.com/?q=buckhead+brewery",
    mon: true, tue: true, wed: false, thu: false, fri: true,
  },
];

/**
 * Starts a tiny HTTP server that mimics Supabase PostgREST.
 * Returns the base URL (e.g., "http://localhost:54399").
 */
export function startMockSupabase(port = 0): Promise<{ url: string; server: http.Server }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // CORS headers (Supabase client sends these)
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // PostgREST venues endpoint
      if (req.url?.includes("/rest/v1/venues")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(MOCK_VENUES));
        return;
      }

      // Auth endpoints (return empty/success for any auth call)
      if (req.url?.includes("/auth/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ user: null, session: null }));
        return;
      }

      // Health check / root
      if (req.url === "/" || req.url === "") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      // Default: 200 empty (Supabase returns various endpoints)
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({}));
    });

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${addr.port}`, server });
    });
  });
}
