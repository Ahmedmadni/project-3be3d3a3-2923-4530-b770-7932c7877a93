import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test.describe("Pregnancy guest mobile acceptance (synthetic data only)", () => {
  test.beforeEach(async ({ page }) => {
    // No real patient records and no production Supabase credentials.
    await page.route("http://127.0.0.1:4173/_fake_supabase/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.goto("/pregnancy");
    await expect(page.locator('section[aria-label="مواعيدي وفحوص الحمل"]')).toBeVisible();
  });

  test("creates, edits, completes and removes an appointment on a small screen", async ({ page }) => {
    const area = page.locator('section[aria-label="مواعيدي وفحوص الحمل"]');
    const form = area.locator("form");
    const title = "اختبار مؤقت للموعد — غير طبي";
    await form.getByPlaceholder("مثال: زيارة متابعة").fill(title);
    await form.locator('input[type="date"]').fill("2026-12-06");
    await form.getByRole("button", { name: "حفظ الموعد" }).click();

    let card = area.locator("article").filter({ hasText: title });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: "تعديل" }).click();
    await expect(form.getByPlaceholder("مثال: زيارة متابعة")).toBeFocused();
    await form.getByPlaceholder("مثال: زيارة متابعة").fill("موعد معدل");
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    card = area.locator("article").filter({ hasText: "موعد معدل" });
    await expect(card).toHaveCount(1);
    await card.getByRole("button", { name: "تم" }).click();
    await expect(card.getByText("مكتمل")).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: "حذف" }).click();
    await expect(card).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });

  test("exports, restores, deduplicates, and discards temporary guest appointments", async ({ page }) => {
    const area = page.locator('section[aria-label="مواعيدي وفحوص الحمل"]');
    const form = area.locator("form");
    const marker = "TEMP-NOT-MEDICAL-TEST-987654";
    await form.getByPlaceholder("مثال: زيارة متابعة").fill(marker);
    await form.locator('input[type="date"]').fill("2026-12-18");
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(area.locator("article").filter({ hasText: marker })).toHaveCount(1);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      area.getByRole("button", { name: "تصدير نسخة من المواعيد" }).click(),
    ]);
    const path = await download.path();
    if (!path) throw new Error("Guest backup download unavailable");
    const json = readFileSync(path);
    expect(JSON.parse(json.toString("utf8")).records).toHaveLength(1);
    expect(JSON.parse(json.toString("utf8")).format).toBe("health-appointments-v1");

    page.once("dialog", (dialog) => dialog.accept());
    await area.locator("article").filter({ hasText: marker }).getByRole("button", { name: "حذف" }).click();
    await expect(area.locator("article").filter({ hasText: marker })).toHaveCount(0);

    const input = area.locator('input[type="file"]');
    const uploaded = { name: "appointments.json", mimeType: "application/json", buffer: json };
    await input.setInputFiles(uploaded);
    await expect(area.locator("article").filter({ hasText: marker })).toHaveCount(1);
    await input.setInputFiles(uploaded);
    await expect(area.locator("article").filter({ hasText: marker })).toHaveCount(1);

    const persisted = await page.evaluate((s) => {
      const values = [...Object.keys(localStorage).map(k => localStorage.getItem(k)),
        ...Object.keys(sessionStorage).map(k => sessionStorage.getItem(k))];
      return values.some(value => value?.includes(s));
    }, marker);
    expect(persisted).toBe(false);

    await page.reload();
    await expect(area.locator("article").filter({ hasText: marker })).toHaveCount(0);
  });


  test("switches between Arabic RTL and English LTR without losing temporary appointments", async ({ page }) => {
    const area = page.locator('section[aria-label="مواعيدي وفحوص الحمل"]');
    const form = area.locator("form");
    await form.getByPlaceholder("مثال: زيارة متابعة").fill("Guest language switch test");
    await form.locator('input[type="date"]').fill("2026-12-20");
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(area.locator("article").filter({ hasText: "Guest language switch test" })).toHaveCount(1);

    await page.locator('header button[title="English"]').click();
    const english = page.locator('section[aria-label="My maternity appointments"]');
    await expect(english).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(english.locator("article").filter({ hasText: "Guest language switch test" })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await page.locator('header button[title="العربية"]').click();
    await expect(area).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(area.locator("article").filter({ hasText: "Guest language switch test" })).toHaveCount(1);
  });

  test("keeps emergency guidance reachable without login if cloud requests fail", async ({ page }) => {
    await page.route("http://127.0.0.1:4173/_fake_supabase/**", (route) => route.abort("failed"));
    await page.goto("/pregnancy");
    const link = page.locator('a[href="/emergency"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/emergency$/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("rejects malformed import with no partial guest record", async ({ page }) => {
    const area = page.locator('section[aria-label="مواعيدي وفحوص الحمل"]');
    await area.locator('input[type="file"]').setInputFiles({
      name: "invalid.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ records: [
        { id: "a", title: "First", appointment_date: "2026-12-19", appointment_time: null, kind: "visit", status: "planned", notes: "" },
        { id: "b", title: "Second", appointment_date: "2026-02-30", appointment_time: null, kind: "visit", status: "planned", notes: "" },
      ] })),
    });
    await expect(area.getByRole("alert")).toContainText("تعذر استعادة النسخة");
    await expect(area.locator("article")).toHaveCount(0);
  });
});

test.describe("Mobile planner viewport checks", () => {
  for (const width of [320, 360, 390, 768]) {
    test("does not overflow horizontally at " + width + "px", async ({ browser }) => {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.route("http://127.0.0.1:4173/_fake_supabase/**", route => route.fulfill({
        status: 200, contentType: "application/json", body: "{}",
      }));
      await page.goto("http://127.0.0.1:4173/pregnancy");
      const area = page.locator('section[aria-label="مواعيدي وفحوص الحمل"]');
      await expect(area).toBeVisible();
      const fit = await area.evaluate((el) =>
        el.scrollWidth <= el.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth + 1);
      expect(fit).toBe(true);
      await page.close();
    });
  }
});
