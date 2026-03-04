import { test as base, expect as baseExpect, Page } from "@playwright/test";
import { MOCK_VENUES } from "./mock-server";

export { MOCK_VENUES };

/** Number of distinct neighborhoods in mock data */
export const NEIGHBORHOOD_COUNT = 4; // Midtown, Buckhead, Decatur, Old Fourth Ward

/**
 * Navigate to the app and wait for it to be ready.
 * The mock Supabase server is already running (global-setup.ts),
 * and the Next.js dev server is configured to use it (playwright.config.ts).
 */
export async function setupPage(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "networkidle" });
}

export const test = base;
export const expect = baseExpect;
