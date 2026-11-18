import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routes = ["sign-in", "student-home", "course", "quiz", "teacher", "admin", "fees", "shop", "reports", "parent", "progress", "students", "teacher-quizzes"];
for (const route of routes) {
  test(`${route} renders without errors or page overflow`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/#${route}`);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Manrope Variable");
    if (["student-home", "teacher", "admin", "progress"].includes(route)) {
      await expect(page.locator(".analytics-card .recharts-surface")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${route}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("role selection opens the administrator dashboard", async ({ page }) => {
  await page.goto("/#sign-in");
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill("demo@school.edu.gh");
  await page.getByLabel("Password", { exact: true }).fill("preview-password");
  await page.getByRole("button", { name: "Sign in as administrator", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Your school, at a glance.", exact: true })).toBeVisible();
});

test("student records use the teacher workspace after a student preview", async ({ page }, info) => {
  await page.goto("/#progress");
  await page.evaluate(() => { window.location.hash = "students"; });
  await expect(page.getByRole("heading", { name: "Students", exact: true })).toBeVisible();
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menu", exact: true }).click();
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation.getByRole("link", { name: "Students", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByLabel("Explore screens")).toHaveValue("students");
});

test("administrator navigation retains the school workspace on student records", async ({ page }, info) => {
  await page.goto("/#admin");
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Students", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Students", exact: true })).toBeVisible();
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByLabel("Explore screens")).toHaveValue("students");
});

test("activity filters update the chart summary and accessible table", async ({ page }) => {
  await page.goto("/#student-home");
  const analytics = page.locator(".analytics-card");
  await expect(analytics.getByText("240 minutes of learning")).toBeVisible();
  await analytics.getByText("View data table", { exact: false }).click();
  await expect(analytics.locator("tbody tr").first().locator("td")).toHaveText("25");
  await page.getByLabel("Activity metric").selectOption("lessons");
  await expect(analytics.getByText("12 lessons studied")).toBeVisible();
  await expect(analytics.locator("tbody tr").first().locator("td")).toHaveText("1");
  await expect(analytics.getByRole("columnheader", { name: "Lessons studied", exact: true })).toBeVisible();
});

test("fee chart sorting preserves class values and offers keyboard access", async ({ page }) => {
  await page.goto("/#admin");
  const analytics = page.locator(".analytics-card");
  await analytics.getByText("View data table", { exact: false }).focus();
  await page.keyboard.press("Enter");
  await expect(analytics.getByRole("table")).toBeVisible();
  await expect(analytics.locator("tbody tr").first()).toHaveText("JHS 170");
  await page.getByLabel("Collection order").selectOption("highest");
  await expect(analytics.locator("tbody tr").first()).toHaveText("JHS 170");
  await expect(analytics.getByRole("row", { name: "JHS 2 39", exact: true })).toBeVisible();
  await page.getByLabel("Analytics class").selectOption("JHS 2");
  await expect(analytics.locator("tbody tr")).toHaveCount(1);
});

test("analytics and navigation work with reduced motion and narrow viewports", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#student-home");
  await expect(page.locator(".analytics-card .recharts-surface")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto("/#admin");
  await expect(page.locator(".analytics-card .recharts-surface")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("lesson completion persists across reloads", async ({ page }, info) => {
  await page.goto("/#course");
  await page.getByRole("button", { name: "Read the lesson" }).click();
  await expect(page.getByText("Forces are measured in newtons", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Choose lesson", exact: false }).click();
  await expect(page.getByText("3 of 4 lessons complete")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Lesson completed" })).toBeDisabled();
});

test("five quiz answers are scored and saved", async ({ page }) => {
  await page.goto("/#quiz");
  for (const [index, answer] of ["A push or a pull", "Newton (N)", "Gravity", "It remains stationary", "Friction"].entries()) {
    await page.getByLabel(answer, { exact: true }).check();
    await page.getByRole("button", { name: index === 4 ? "Finish quiz" : "Next question", exact: true }).click();
  }
  await expect(page.getByText("5 out of 5")).toBeVisible();
  await page.getByRole("button", { name: "Back to home" }).click();
  await page.goto("/#progress");
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.goto("/#teacher");
  await page.locator(".chart-data > summary").click();
  await expect(page.locator(".analytics-card").getByRole("row", { name: "Forces and motion 85", exact: true })).toBeVisible();
});

test("quiz returns to an unanswered question before allowing completion", async ({ page }) => {
  await page.goto("/#quiz");
  await page.getByRole("button", { name: "Question 5", exact: true }).click();
  await page.getByLabel("Friction", { exact: true }).check();
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await expect(page.getByText("Question 1 of 5", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Answer all five questions");
  await expect(page.getByRole("heading", { name: "Quiz complete", exact: true })).toHaveCount(0);
});

test("fee editing and a demo parent payment update the local records", async ({ page }) => {
  await page.goto("/#fees");
  await page.getByRole("button", { name: "Edit fee structure" }).click();
  await page.getByLabel("Tuition (GH₵)").fill("1350");
  await page.getByRole("button", { name: "Save fee structure" }).click();
  await expect(page.getByText("GH₵ 1,350.00", { exact: true })).toBeVisible();
  await page.goto("/#parent");
  await page.getByLabel("Amount to pay").fill("100");
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await page.getByRole("button", { name: "Complete demo payment" }).click();
  await expect(page.getByText("GH₵ 700.00", { exact: true })).toBeVisible();
  await page.goto("/#fees");
  await expect(page.getByText("GH₵ 700.00", { exact: true })).toBeVisible();
});

test("shop item editing and parent orders share the same inventory", async ({ page }) => {
  await page.goto("/#shop");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Item name").fill("School backpack");
  await page.getByLabel("Price (GH₵)").fill("80");
  await page.getByLabel("Stock quantity").fill("5");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByRole("heading", { name: "School backpack" })).toBeVisible();
  await page.goto("/#parent");
  const row = page.locator(".parent-shop .list-row").filter({ hasText: "School backpack" });
  await row.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Review order and pay" }).click();
  await page.getByRole("button", { name: "Place demo order" }).click();
  await page.goto("/#shop");
  await expect(page.getByText("School backpack × 1", { exact: true })).toBeVisible();
});

test("teacher reviews the local sample draft before approval", async ({ page }) => {
  await page.goto("/#teacher");
  await page.getByLabel("Paste lesson text").fill("A force is a push or a pull. Forces can change the motion of an object.");
  await page.getByRole("button", { name: "Generate draft questions" }).click();
  await page.getByRole("button", { name: "Review 5 draft questions" }).click();
  await page.getByLabel("Question", { exact: true }).first().fill("What is a force?");
  await page.getByRole("button", { name: "Approve draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Draft approved", exact: true })).toBeDisabled();
});

test("report download is a PDF and fee export is a CSV", async ({ page }) => {
  await page.goto("/#parent");
  const pdfEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const pdf = await pdfEvent;
  expect(pdf.suggestedFilename()).toBe("student-report.pdf");
  const content = await readFile((await pdf.path())!);
  expect(content.subarray(0, 8).toString()).toBe("%PDF-1.4");
  await page.goto("/#fees");
  const csvEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const csv = await csvEvent;
  expect((await readFile((await csv.path())!, "utf8")).startsWith("Student,Class,Balance (GHS),Status")).toBe(true);
});

test("report card renders model-driven subject rows", async ({ page }) => {
  await page.goto("/#reports");
  await expect(page.locator(".report-table tbody tr")).toHaveCount(5);
  await expect(page.locator(".report-table tbody tr").first()).toContainText("Mathematics");
  await expect(page.locator(".report-table tbody tr").first()).toContainText("85");
  await expect(page.locator(".report-document")).toContainText("DevX Demo School");
});

test("report header shows the school crest", async ({ page }) => {
  await page.goto("/#reports");
  await expect(page.locator('.report-document .crest svg[aria-label="School crest"]')).toBeVisible();
});

test("screen picker and mobile menu expose all reference screens", async ({ page }, info) => {
  await page.goto("/#student-home");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  }
  await page.getByLabel("Explore screens").selectOption("reports");
  await expect(page.getByRole("heading", { name: "Report cards", exact: true })).toBeVisible();
});
