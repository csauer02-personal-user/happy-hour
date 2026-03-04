import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getVenues } from "@/lib/venues";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { ExistingDeal, DaySchedule, ExtractedDeal } from "@/lib/deal-types";

export async function GET() {
  try {
    const venues = await getVenues();

    // Convert Venue[] to ExistingDeal[] format for the Deal Updater
    const deals: ExistingDeal[] = venues.map((v) => ({
      id: String(v.id),
      restaurant_name: v.restaurant_name,
      deal_description: v.deal,
      days: {
        monday: v.mon,
        tuesday: v.tue,
        wednesday: v.wed,
        thursday: v.thu,
        friday: v.fri,
        saturday: false,
        sunday: false,
      } as DaySchedule,
      neighborhood: v.neighborhood,
      last_updated: new Date().toISOString(),
      latitude: v.latitude,
      longitude: v.longitude,
    }));

    return NextResponse.json(deals, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("Failed to fetch venues:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    // Require authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: {
      extractedData: ExtractedDeal;
      matchedVenueId?: string | null;
      location?: { lat: number; lng: number; source: string } | null;
    } = await request.json();
    const { extractedData, matchedVenueId, location } = body;

    // Geocode via Google Places API (server-side key — no referrer restriction)
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    let lat: number | null = null;
    let lng: number | null = null;
    let restaurant_url: string | null = null;
    let maps_url: string | null = null;
    let neighborhood: string = extractedData.google_place?.neighborhood ?? "";

    if (apiKey && extractedData.restaurant_name) {
      try {
        const query = encodeURIComponent(`${extractedData.restaurant_name} Atlanta`);
        const textSearchRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`
        );
        const textSearchData = await textSearchRes.json();
        console.log(`[Geocode] Text search for "${extractedData.restaurant_name}": status=${textSearchData?.status}, results=${textSearchData?.results?.length ?? 0}`);
        if (textSearchData?.status !== "OK") {
          console.warn(`[Geocode] Text search non-OK status: ${textSearchData?.status}`, textSearchData?.error_message);
        }
        const placeId = textSearchData?.results?.[0]?.place_id;

        if (placeId) {
          const detailsRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,website,formatted_address,address_components,url&key=${apiKey}`
          );
          const detailsData = await detailsRes.json();
          console.log(`[Geocode] Place details for ${placeId}: status=${detailsData?.status}`);
          if (detailsData?.status !== "OK") {
            console.warn(`[Geocode] Place details non-OK status: ${detailsData?.status}`, detailsData?.error_message);
          }
          const result = detailsData?.result;

          if (result) {
            lat = result.geometry?.location?.lat ?? null;
            lng = result.geometry?.location?.lng ?? null;
            restaurant_url = result.website ?? null;
            maps_url = result.url ?? null;

            // Extract neighborhood from address_components
            const components: { types: string[]; long_name: string }[] = result.address_components ?? [];
            const neighborhoodComp = components.find((c) => c.types.includes("neighborhood"))
              ?? components.find((c) => c.types.includes("sublocality_level_1"));
            if (neighborhoodComp) {
              neighborhood = neighborhoodComp.long_name;
            }
          }
        }
      } catch (geocodeErr) {
        console.error("[Geocode] Failed, proceeding without coordinates:", geocodeErr);
      }
    }

    // Fallback: if Google returned no coords, use client GPS location
    if (lat == null && lng == null && location?.lat && location?.lng) {
      lat = location.lat;
      lng = location.lng;
      console.log(`[Geocode] Using client ${location.source} fallback: lat=${lat}, lng=${lng}`);
    }

    console.log(`[Geocode] Final coords for "${extractedData.restaurant_name}": lat=${lat}, lng=${lng}, neighborhood=${neighborhood}`);

    // Map days to venue columns
    const { days } = extractedData;
    const venueRow = {
      restaurant_name: extractedData.restaurant_name,
      deal: extractedData.deal_description,
      neighborhood: neighborhood || null,
      latitude: lat,
      longitude: lng,
      restaurant_url,
      maps_url,
      mon: days.monday,
      tue: days.tuesday,
      wed: days.wednesday,
      thu: days.thursday,
      fri: days.friday,
    };

    const admin = createAdminClient();
    let savedRow;

    if (matchedVenueId) {
      const { data, error } = await admin
        .from("venues")
        .update(venueRow)
        .eq("id", matchedVenueId)
        .select()
        .single();
      if (error) throw error;
      savedRow = data;
    } else {
      const { data, error } = await admin
        .from("venues")
        .insert(venueRow)
        .select()
        .single();
      if (error) throw error;
      savedRow = data;
    }

    revalidatePath("/");

    return NextResponse.json({ success: true, venue: savedRow });
  } catch (error) {
    console.error("Failed to save venue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save venue" },
      { status: 500 }
    );
  }
}
