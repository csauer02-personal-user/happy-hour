import { test, expect, setupPage, MOCK_VENUES } from "./fixtures";

test.describe("Desktop layout", () => {
  test("sidebar is visible on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await setupPage(page);
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
  });

  test("bottom sheet is hidden on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await setupPage(page);
    const bottomSheet = page.locator(".fixed.bottom-0.md\\:hidden");
    await expect(bottomSheet).not.toBeVisible();
  });

  test("day filters appear in header on desktop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");
    await setupPage(page);
    const headerSlot = page.locator("#header-nav-slot");
    const dayButtons = headerSlot.getByRole("button");
    await expect(dayButtons.first()).toBeVisible();
  });
});

test.describe("Mobile portrait layout", () => {
  test("sidebar is hidden on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-portrait", "mobile-portrait only");
    await setupPage(page);
    const sidebar = page.locator("aside");
    await expect(sidebar).not.toBeVisible();
  });

  test("bottom sheet is visible on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-portrait", "mobile-portrait only");
    await setupPage(page);
    const bottomSheet = page.locator(".fixed.bottom-0").first();
    await expect(bottomSheet).toBeVisible();
  });

  test("bottom sheet shows venue count", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-portrait", "mobile-portrait only");
    await setupPage(page);
    const countText = page.getByText(
      new RegExp(`${MOCK_VENUES.length}\\s+spot`, "i")
    );
    await expect(countText.first()).toBeVisible();
  });

  test("bottom sheet has day filter buttons", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-portrait", "mobile-portrait only");
    await setupPage(page);
    const allBtn = page.getByRole("button", { name: "All" }).first();
    await expect(allBtn).toBeVisible();
  });
});

test.describe("Mobile landscape layout", () => {
  test("page renders in landscape without overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-landscape", "mobile-landscape only");
    await setupPage(page);
    await expect(page.getByText("ATL Happy Hour").first()).toBeVisible();
  });

  test("bottom sheet is visible in landscape mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-landscape", "mobile-landscape only");
    await setupPage(page);
    const bottomSheet = page.locator(".fixed.bottom-0").first();
    await expect(bottomSheet).toBeVisible();
  });
});

test.describe("Tablet layout", () => {
  test("sidebar is visible on tablet (768px >= md breakpoint)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet", "tablet only");
    await setupPage(page);
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();
  });

  test("bottom sheet is hidden on tablet", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablet", "tablet only");
    await setupPage(page);
    const bottomSheet = page.locator(".fixed.bottom-0.md\\:hidden");
    await expect(bottomSheet).not.toBeVisible();
  });
});

test.describe("Responsive transitions", () => {
  test("resizing from desktop to mobile switches sidebar to bottom sheet", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop only");

    await setupPage(page);

    // Desktop: sidebar visible
    await expect(page.locator("aside")).toBeVisible();

    // Resize to mobile width
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);

    // Sidebar should be hidden, bottom sheet visible
    await expect(page.locator("aside")).not.toBeVisible();
    const bottomSheet = page.locator(".fixed.bottom-0").first();
    await expect(bottomSheet).toBeVisible();
  });

  test("resizing from mobile to desktop switches bottom sheet to sidebar", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-portrait", "mobile-portrait only");

    await setupPage(page);

    // Mobile: bottom sheet visible
    const bottomSheet = page.locator(".fixed.bottom-0").first();
    await expect(bottomSheet).toBeVisible();

    // Resize to desktop width
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);

    // Sidebar should now be visible
    await expect(page.locator("aside")).toBeVisible();
  });
});
