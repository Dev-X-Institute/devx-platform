import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function dataset(page: Page, mode: string) {
  await page.locator(".preview-tools > summary").click();
  await page.getByLabel("Preview dataset").selectOption(mode);
}

test("inline validation focuses the invalid field and keeps forms open", async ({ page }) => {
  await page.goto("/#sign-in");
  await page.getByRole("button", { name: "Sign in as student", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByText("Email is required.", { exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Sign in as student", exact: true }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.goto("/#shop");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.getByLabel("Item name")).toBeFocused();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/#parent");
  await page.getByLabel("Amount to pay").fill("651");
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await expect(page.getByText("Enter 650 or less.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("payment updates analytics and undo restores balance and history", async ({ page }) => {
  await page.goto("/#parent");
  await page.getByLabel("Amount to pay").fill("100");
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await page.getByRole("button", { name: "Complete demo payment" }).click();
  await expect(page.locator(".balance-amount")).toHaveText("GH₵ 550.00");
  await page.evaluate(() => { location.hash = "admin"; });
  await page.locator(".chart-data > summary").click();
  await expect(page.locator(".analytics-card").getByRole("row", { name: "JHS 2 41", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo last change" }).click();
  await expect(page.locator(".analytics-card").getByRole("row", { name: "JHS 2 39", exact: true })).toBeVisible();
  await page.reload();
  const balance = await page.evaluate(() => JSON.parse(localStorage.getItem("devx-education-demo-v1")!).balance);
  expect(balance).toBe(650);
});

test("reading records elapsed study time and date filters export current values", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-17T12:00:00Z") });
  await page.goto("/#course");
  await page.getByRole("button", { name: "Read the lesson", exact: false }).click();
  await page.clock.fastForward(120000);
  await page.getByRole("button", { name: "Close reading", exact: true }).click();
  await page.evaluate(() => { location.hash = "progress"; });
  await page.getByLabel("Date range").selectOption("1");
  await expect(page.locator(".chart-summary")).toContainText("minutes of learning");
  const todayTotal = Number((await page.locator(".chart-summary").innerText()).split(" ")[0]);
  // Closing the reading can add a fraction of a minute after the clock advances.
  expect(todayTotal).toBeGreaterThanOrEqual(34);
  expect(todayTotal).toBeLessThan(34.25);
  await page.getByLabel("Date range").selectOption("30");
  await page.locator(".chart-data > summary").click();
  await expect(page.locator(".chart-data tbody tr")).toHaveCount(30);
  const dates = await page.locator(".chart-data tbody th").allTextContents();
  expect(new Set(dates).size).toBe(30);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export analytics" }).click();
  const csv = await event;
  const rows = (await readFile((await csv.path())!, "utf8")).split("\n");
  expect(rows).toHaveLength(31);
  expect(rows.at(-1)).toContain(`"${todayTotal}"`);
});

test("lesson completion updates the roster and can be undone", async ({ page }) => {
  await page.goto("/#course");
  await page.getByRole("button", { name: "Mark lesson complete", exact: true }).click();
  await page.evaluate(() => { location.hash = "students"; });
  await expect(page.getByRole("row").filter({ hasText: "Student 2" })).toContainText("75%");
  await page.getByRole("button", { name: "Undo last change" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Student 2" })).toContainText("50%");
});

test("all four lesson diagrams respond to keyboard controls", async ({ page }) => {
  await page.goto("/#course");
  const toggle = page.locator(".lesson-menu-toggle");
  if (await toggle.isVisible()) await expect(page.locator(".lesson-list")).toBeHidden();
  await page.getByRole("button", { name: "Unbalanced forces", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".diagram-description")).toContainText("5 N to the right");
  for (const lesson of ["Matter", "Energy", "Electricity"]) {
    if (await toggle.isVisible()) await toggle.click();
    await page.locator(".lesson-item").filter({ hasText: lesson }).click();
    if (await toggle.isVisible()) {
      await expect(page.locator(".lesson-list")).toBeHidden();
      await expect(page.locator(".lesson-detail > div[tabindex]")).toBeFocused();
    }
    if (lesson === "Matter") {
      await page.getByRole("button", { name: "Gas", exact: true }).click();
      await expect(page.locator(".diagram-description")).toContainText("far apart");
    } else if (lesson === "Energy") {
      await page.getByLabel("Energy example").selectOption("bicycle");
      await expect(page.locator(".diagram-description")).toContainText("chemical energy");
    } else {
      await page.getByRole("button", { name: "Open switch", exact: true }).click();
      await expect(page.locator(".diagram-description")).toContainText("lamp is off");
    }
  }
});

test("loading and error previews recover without replacing saved data", async ({ page }) => {
  await page.goto("/#students");
  await dataset(page, "loading");
  await expect(page.getByRole("heading", { name: "Loading school records" })).toBeVisible();
  await page.getByLabel("Preview dataset").selectOption("error");
  await expect(page.getByRole("heading", { name: "School records could not load" })).toBeVisible();
  await page.getByRole("button", { name: "Retry loading" }).click();
  await expect(page.getByRole("heading", { name: "Students", exact: true })).toBeVisible();
  await page.getByLabel("Preview dataset").selectOption("empty");
  await expect(page.getByRole("heading", { name: "No students in this class" })).toBeVisible();
  await page.getByLabel("Preview dataset").selectOption("demo");
  await expect(page.locator(".responsive-table tbody tr")).toHaveCount(4);
});

test("temporary stress data respects stock limits and leaves saved records unchanged", async ({ page }) => {
  await page.goto("/#course");
  await page.getByRole("button", { name: "Mark lesson complete", exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem("devx-education-demo-v1"));
  await dataset(page, "worst");
  await page.evaluate(() => { location.hash = "parent"; });
  const row = page.locator(".parent-shop .list-row").filter({ hasText: "Exercise books" });
  await row.getByRole("button", { name: "Add", exact: true }).click();
  await expect(row.getByRole("button", { name: "Add", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Review order and pay", exact: false }).click();
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(row.getByRole("button", { name: "Out of stock", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Undo last change" }).click();
  await expect(row.getByRole("button", { name: "Add", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem("devx-education-demo-v1"))).toBe(saved);
  await page.getByLabel("Preview dataset").selectOption("demo");
  await expect(page.locator(".balance-amount")).toHaveText("GH₵ 650.00");
});

test("storage failure reports unsaved changes and retry persists them", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (!(window as unknown as { allowStorage?: boolean }).allowStorage) throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/#course");
  await page.getByRole("button", { name: "Mark lesson complete", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("browser storage could not save");
  await page.evaluate(() => { (window as unknown as { allowStorage: boolean }).allowStorage = true; });
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.locator(".storage-error")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("devx-education-demo-v1")!).completed)).toEqual([0, 1, 2]);
});

test("mobile menu contains keyboard focus and returns focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#student-home");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Navigation menu" });
  await expect(menu).toBeVisible();
  await menu.getByLabel("Explore screens").focus();
  await page.keyboard.press("Tab");
  await expect(menu.getByRole("button", { name: "Close navigation" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(menu.getByLabel("Explore screens")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
});

test("large record lists paginate and searches reset to the first page", async ({ page }) => {
  await page.goto("/#students");
  await dataset(page, "large");
  await expect(page.locator(".responsive-table tbody tr")).toHaveCount(20);
  const first = await page.locator(".responsive-table tbody th").first().innerText();
  await page.getByRole("navigation", { name: "Pagination" }).getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".responsive-table tbody th").first()).not.toHaveText(first);
  await page.getByLabel("Search students").fill("Aleksandra");
  await expect(page.getByRole("navigation", { name: "Pagination" }).getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  await page.evaluate(() => { location.hash = "shop"; });
  await expect(page.locator(".orders-list .list-row")).toHaveCount(10);
  await expect(page.getByRole("navigation", { name: "Pagination" })).toContainText("1–10 of 1,000 records");
});

test("the design system gallery exposes shared states", async ({ page }) => {
  await page.goto("/#students");
  await dataset(page, "demo");
  await page.getByRole("button", { name: "Open design system" }).click();
  const gallery = page.getByRole("dialog", { name: "DevX design system" });
  await expect(gallery.getByRole("button", { name: "Disabled", exact: true })).toBeDisabled();
  await expect(gallery.getByLabel("Invalid field")).toHaveAttribute("aria-invalid", "true");
  await expect(gallery.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
});

test("older saves migrate payments and malformed record arrays recover", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/#course");
  await page.getByRole("button", { name: "Mark lesson complete", exact: true }).click();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("devx-education-demo-v1")!);
    for (const key of ["students", "study", "payments", "attempts"]) delete saved[key];
    saved.balance = 550;
    localStorage.setItem("devx-education-demo-v1", JSON.stringify(saved));
    location.hash = "parent";
  });
  await page.reload();
  await expect(page.locator(".balance-amount")).toHaveText("GH₵ 550.00");
  await page.getByLabel("Amount to pay").fill("100");
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await page.getByRole("button", { name: "Complete demo payment" }).click();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("devx-education-demo-v1")!);
    saved.students = [{ name: null }]; saved.study = [{ minutes: "bad" }];
    localStorage.setItem("devx-education-demo-v1", JSON.stringify(saved));
    location.hash = "students";
  });
  await page.reload();
  await expect(page.locator(".responsive-table tbody tr")).toHaveCount(4);
  await expect(page.getByRole("row").filter({ hasText: "Student 2" })).toContainText("GH₵ 450.00");
  expect(errors).toEqual([]);
});

test("reminder drafts use each outstanding balance and CSV guards formula names", async ({ page }) => {
  await page.goto("/#fees");
  await page.getByRole("button", { name: "Send reminders", exact: false }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save reminder draft" }).click();
  const draft = await event;
  const text = await readFile((await draft.path())!, "utf8");
  expect(text).toContain("for Student 2 is GH₵ 650.00");
  expect(text).toContain("for Student 3 is GH₵ 1,500.00");
  expect(text).not.toContain("Student: Student 1");
  await page.getByRole("button", { name: "Edit fee structure" }).click();
  await page.getByRole("button", { name: "Save fee structure" }).click();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("devx-education-demo-v1")!);
    saved.students[1].name = "=SUM(1,2)";
    localStorage.setItem("devx-education-demo-v1", JSON.stringify(saved));
  });
  await page.reload();
  const csvEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const csv = await csvEvent;
  expect(await readFile((await csv.path())!, "utf8")).toContain("\"'=SUM(1,2)\"");
});
