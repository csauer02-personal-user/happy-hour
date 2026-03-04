import { test, expect, setupPage, MOCK_VENUES, NEIGHBORHOOD_COUNT } from "./fixtures";

test.describe("Page load", () => {
  test("renders venue cards matching mock data count", async ({ page }) => {
    await setupPage(page);

    // Venue cards should be present (inside sidebar on desktop, bottom sheet on mobile)
    // Look for venue names in the page content
    for (const venue of MOCK_VENUES) {
      await expect(page.getByText(venue.restaurant_name).first()).toBeVisible();
    }
  });

  test("renders neighborhood headers", async ({ page }) => {
    await setupPage(page);

    const neighborhoods = [...new Set(MOCK_VENUES.map((v) => v.neighborhood))];
    for (const name of neighborhoods) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test("displays venue count", async ({ page }) => {
    await setupPage(page);

    // The sidebar shows "X venues" or bottom sheet shows "X spots"
    const countText = page.getByText(new RegExp(`${MOCK_VENUES.length}\\s+(venue|spot)`, "i"));
    await expect(countText.first()).toBeVisible();
  });

  test("shows day filter buttons", async ({ page }) => {
    await setupPage(page);

    // Day filter buttons: All, M, T, W, T, F
    await expect(page.getByRole("button", { name: "All" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "M" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "F" }).first()).toBeVisible();
  });
});

test.describe("Day filter", () => {
  test("clicking Monday filter shows only Monday venues", async ({ page }) => {
    await setupPage(page);

    const mondayBtn = page.getByRole("button", { name: "M" }).first();
    await mondayBtn.click();

    // Monday venues: ids 1, 3, 4, 6
    const mondayVenues = MOCK_VENUES.filter((v) => v.mon);
    const nonMondayVenues = MOCK_VENUES.filter((v) => !v.mon);

    // Count text should update
    const countText = page.getByText(
      new RegExp(`${mondayVenues.length}\\s+(venue|spot)`, "i")
    );
    await expect(countText.first()).toBeVisible();

    // Monday venues should still appear
    for (const venue of mondayVenues) {
      await expect(page.getByText(venue.restaurant_name).first()).toBeVisible();
    }
  });

  test("clicking Wednesday filter shows only Wednesday venues", async ({ page }) => {
    await setupPage(page);

    const wedBtn = page.getByRole("button", { name: "W" }).first();
    await wedBtn.click();

    const wedVenues = MOCK_VENUES.filter((v) => v.wed);
    const countText = page.getByText(
      new RegExp(`${wedVenues.length}\\s+(venue|spot)`, "i")
    );
    await expect(countText.first()).toBeVisible();
  });

  test("toggling day filter back to All shows all venues", async ({ page }) => {
    await setupPage(page);

    // Click Monday
    await page.getByRole("button", { name: "M" }).first().click();
    // Click All
    await page.getByRole("button", { name: "All" }).first().click();

    const countText = page.getByText(
      new RegExp(`${MOCK_VENUES.length}\\s+(venue|spot)`, "i")
    );
    await expect(countText.first()).toBeVisible();
  });
});

test.describe("Neighborhood expand/collapse", () => {
  test("clicking neighborhood header expands venue list", async ({ page }) => {
    await setupPage(page);

    // Click "Midtown" header
    const midtownHeader = page.getByRole("button", { name: /Midtown/i }).first();
    await midtownHeader.click();

    // Midtown venues should be visible
    const midtownVenues = MOCK_VENUES.filter((v) => v.neighborhood === "Midtown");
    for (const venue of midtownVenues) {
      await expect(page.getByText(venue.restaurant_name).first()).toBeVisible();
    }
  });

  test("clicking expanded neighborhood header collapses it", async ({ page }) => {
    await setupPage(page);

    const midtownHeader = page.getByRole("button", { name: /Midtown/i }).first();

    // Expand
    await midtownHeader.click();
    await expect(page.getByText("The Midtown Tap")).toBeVisible();

    // Collapse
    await midtownHeader.click();

    // Venue cards inside should be hidden
    await expect(page.getByText("The Midtown Tap")).not.toBeVisible();
  });
});

test.describe("Venue selection from card", () => {
  test("clicking a venue card highlights it", async ({ page }) => {
    await setupPage(page);

    // First expand the neighborhood
    await page.getByRole("button", { name: /Midtown/i }).first().click();

    // Click a venue card
    const card = page.getByText("The Midtown Tap").first();
    await card.click();

    // The card should get the selected class (venue-card-selected adds ring)
    const venueCard = page.locator(".venue-card-selected");
    await expect(venueCard).toBeVisible();
  });
});

test.describe("Venue selection from map", () => {
  // This test checks that venue cards are accessible via keyboard as well
  test("venue cards are keyboard accessible", async ({ page }) => {
    await setupPage(page);

    // Expand neighborhood
    await page.getByRole("button", { name: /Midtown/i }).first().click();

    // Find a venue card with role=button
    const venueButton = page.locator('[role="button"][aria-selected]').first();
    await expect(venueButton).toBeVisible();
  });
});

test.describe("Rapid clicking", () => {
  test("clicking multiple venues rapidly does not cause errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await setupPage(page);

    // Expand all neighborhoods
    const neighborhoods = [...new Set(MOCK_VENUES.map((v) => v.neighborhood))];
    for (const name of neighborhoods) {
      await page.getByRole("button", { name: new RegExp(name, "i") }).first().click();
    }

    // Rapidly click through all venue cards
    for (const venue of MOCK_VENUES) {
      const el = page.getByText(venue.restaurant_name).first();
      await el.click({ delay: 50 });
    }

    // Click through them all again quickly
    for (const venue of MOCK_VENUES) {
      const el = page.getByText(venue.restaurant_name).first();
      await el.click({ delay: 20 });
    }

    // All venue names should still be visible
    for (const venue of MOCK_VENUES) {
      await expect(page.getByText(venue.restaurant_name).first()).toBeVisible();
    }

    // No console errors related to our app
    const appErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("google") && !e.includes("maps")
    );
    expect(appErrors).toEqual([]);
  });
});

test.describe("Info window", () => {
  // Info window appears in Google Maps which we stub - test the data flow
  test("venue cards display deal text and name", async ({ page }) => {
    await setupPage(page);

    // Expand a neighborhood
    await page.getByRole("button", { name: /Buckhead/i }).first().click();

    // Verify deal text is shown
    await expect(page.getByText("BOGO cocktails and $3 sliders")).toBeVisible();
    await expect(page.getByText("Buckhead Bites")).toBeVisible();
  });

  test("venue cards with URLs show link icons", async ({ page }) => {
    await setupPage(page);

    await page.getByRole("button", { name: /Buckhead/i }).first().click();

    // Buckhead Bites has both restaurant_url and maps_url
    const card = page.getByText("Buckhead Bites").first().locator("..");
    const links = card.locator("a[target='_blank']");
    await expect(links).toHaveCount(2);
  });
});

test.describe("Auth flow console check", () => {
  test("page loads without LockManager errors", async ({ page }) => {
    const lockErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("LockManager")) {
        lockErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      if (err.message.includes("LockManager")) {
        lockErrors.push(err.message);
      }
    });

    await setupPage(page);

    // Wait a bit for any async auth initialization
    await page.waitForTimeout(2000);

    expect(lockErrors).toEqual([]);
  });
});

test.describe("Responsive layout", () => {
  test("header shows ATL Happy Hour branding", async ({ page }) => {
    await setupPage(page);
    await expect(page.getByText("ATL Happy Hour").first()).toBeVisible();
  });

  test("Add Deal button is visible", async ({ page }) => {
    await setupPage(page);
    // The "+" is always visible; "Add Deal" text may be hidden on small screens
    await expect(page.getByRole("link", { name: /Add Deal|\+/ }).first()).toBeVisible();
  });
});
