import { test, expect } from "@playwright/test";

for (const width of [320, 375, 768, 1440]) {
  test(`record screens tolerate worst, empty, one and large datasets at ${width}px`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "The matrix sets its own viewport sizes.");
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#students");
    await page.locator(".preview-tools > summary").click();
    for (const mode of ["worst", "empty", "one", "large"]) {
      await page.getByLabel("Preview dataset").selectOption(mode);
      for (const [route, title] of Object.entries({ students: "Students", fees: "School fees", shop: "School shop", parent: "Your child’s school day, connected.", reports: "Report cards", teacher: "JHS 2 Integrated Science", admin: "Your school, at a glance." })) {
        await page.evaluate(route => { location.hash = route; }, route);
        await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        if (["teacher", "admin"].includes(route)) await expect(page.locator(".analytics-card")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}/${mode}/${width} overflow`).toBe(true);
        if (route === "students") expect(await page.locator(".responsive-table tbody tr").count()).toBeLessThanOrEqual(20);
        if (route === "shop") expect(await page.locator(".orders-list .list-row").count()).toBeLessThanOrEqual(10);
        if (mode === "worst" && ["students", "parent", "reports"].includes(route)) await page.screenshot({ path: info.outputPath(`${route}-${width}.png`), fullPage: true });
      }
      await page.evaluate(() => { location.hash = "students"; });
    }
    await page.addStyleTag({ content: "body { font-size: 24px !important; } p, label, .button { font-size: 1.2em !important; }" });
    await page.getByLabel("Preview dataset").selectOption("worst");
    for (const route of ["students", "parent", "course"]) {
      await page.evaluate(route => { location.hash = route; }, route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `large text ${route}/${width} overflow`).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
