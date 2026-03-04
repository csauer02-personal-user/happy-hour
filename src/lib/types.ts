export interface Venue {
  id: number;
  restaurant_name: string;
  deal: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  restaurant_url: string | null;
  maps_url: string | null;
  deal_highlight: string | null;
  category_emoji: string | null;
  mon: boolean;
  tue: boolean;
  wed: boolean;
  thu: boolean;
  fri: boolean;
}

export type DayFilter = "all" | "mon" | "tue" | "wed" | "thu" | "fri";

export const DAY_LABELS: Record<DayFilter, { full: string; short: string }> = {
  all: { full: "All Days", short: "All" },
  mon: { full: "Monday", short: "M" },
  tue: { full: "Tuesday", short: "T" },
  wed: { full: "Wednesday", short: "W" },
  thu: { full: "Thursday", short: "T" },
  fri: { full: "Friday", short: "F" },
};

export const DAYS: DayFilter[] = ["all", "mon", "tue", "wed", "thu", "fri"];

export function getTodayKey(): DayFilter | null {
  const day = new Date().getDay();
  const map: Record<number, DayFilter> = {
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
  };
  return map[day] ?? null;
}
