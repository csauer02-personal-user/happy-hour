export interface DaySchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface GooglePlace {
  name: string;
  neighborhood: string;
  address: string;
  rating: number | null;
}

export interface ExtractedDeal {
  restaurant_name: string;
  deal_description: string;
  deal_highlight?: string | null;
  category_emoji?: string | null;
  days: DaySchedule;
  confidence: number;
  google_place: GooglePlace;
  matched_venue_id?: number | null;
}

export interface ExistingDeal {
  id: string;
  restaurant_name: string;
  deal_description: string;
  deal_highlight?: string | null;
  category_emoji?: string | null;
  days: DaySchedule;
  neighborhood: string;
  last_updated: string;
  latitude?: number | null;
  longitude?: number | null;
}

export type DealUpdaterView =
  | "welcome"
  | "home"
  | "processing"
  | "matching"
  | "comparison"
  | "review"
  | "search"
  | "success";
