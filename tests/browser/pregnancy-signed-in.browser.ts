import { expect, test } from "@playwright/test";
import { createSyntheticSupabaseApi, installSyntheticSession, swapSyntheticSession, TEST_USERS } from "./synthetic-supabase";

function futureDay(offset: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const selector = 'section[aria-label="مواعيدي وفحوص الحمل"]';

test.describe("Pregnancy signed-in appointment acceptance (fake Supabase; no real credentials)", () => {
  test("keeps two timed appointments in the owner account across reload, edits and status changes", async ({ page }) => {
    const backend = createSyntheticSupabaseApi();
    await page.route("http://127.0.0.1:4173/_fake_supabase/**", backend.serve);
    await installSyntheticSession(page, TEST_USERS.a);
    await page.goto("/pregnancy");
    const area = page.locator(selector);
    await expect(area).toBeVisible();
    await expect(area.getByText("المواعيد محفوظة لحسابك فقط")).toBeVisible();

    const form = area.locator("form");
    const day = futureDay(45);
    for (const [name, time] of [["A late appointment", "15:30"], ["B early appointment", "09:15"]]) {
      await form.getByPlaceholder("مثال: زيارة متابعة").fill(name);
      await form.locator('input[type="date"]').fill(day);
      await form.locator('input[type="time"]').fill(time);
      await form.getByRole("button", { name: "حفظ الموعد" }).click();
      await expect(area.locator("article").filter({ hasText: name })).toHaveCount(1);
    }

    await expect(area.locator("article h4")).toHaveText(["B early appointment", "A late appointment"]);
    await page.reload();
    await expect(area.locator("article h4")).toHaveText(["B early appointment", "A late appointment"]);

    const card = area.locator("article").filter({ hasText: "B early appointment" });
    await card.getByRole("button", { name: "تعديل" }).click();
    await form.getByPlaceholder("مثال: زيارة متابعة").fill("B edited appointment");
    await form.locator("textarea").fill("Synthetic check-in question");
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(area.locator("article").filter({ hasText: "B edited appointment" })).toHaveCount(1);
    await page.reload();
    await expect(area.locator("article").filter({ hasText: "Synthetic check-in question" })).toHaveCount(1);
    const edited = area.locator("article").filter({ hasText: "B edited appointment" });
    await edited.getByRole("button", { name: "تم" }).click();
    await expect(edited.getByText("مكتمل")).toBeVisible();
    await page.reload();
    await expect(area.locator("article").filter({ hasText: "B edited appointment" }).getByText("مكتمل")).toBeVisible();
    await area.locator("article").filter({ hasText: "B edited appointment" }).getByRole("button", { name: "إعادة جدولة" }).click();
    await expect(area.locator("article").filter({ hasText: "B edited appointment" }).getByText("قادم")).toBeVisible();
    page.once("dialog", dialog => dialog.accept());
    await area.locator("article").filter({ hasText: "B edited appointment" }).getByRole("button", { name: "حذف" }).click();
    await expect(area.locator("article").filter({ hasText: "B edited appointment" })).toHaveCount(0);
    await page.reload();
    await expect(area.locator("article h4")).toHaveText(["A late appointment"]);
    expect(backend.rows.size).toBe(1);
    expect([...backend.rows.values()][0]?.user_id).toBe(TEST_USERS.a);
  });

  test("switches between independent synthetic accounts without exposing prior account records", async ({ page }) => {
    const backend = createSyntheticSupabaseApi();
    await page.route("http://127.0.0.1:4173/_fake_supabase/**", backend.serve);
    await installSyntheticSession(page, TEST_USERS.a);
    await page.goto("/pregnancy");
    const area = page.locator(selector);
    await expect(area).toBeVisible();
    const form = area.locator("form");
    await form.getByPlaceholder("مثال: زيارة متابعة").fill("ACCOUNT-A-PRIVATE-APPOINTMENT");
    await form.locator('input[type="date"]').fill(futureDay(40));
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(area.locator("article").filter({ hasText: "ACCOUNT-A-PRIVATE-APPOINTMENT" })).toHaveCount(1);

    await swapSyntheticSession(page, TEST_USERS.b);
    await expect(area).toBeVisible();
    await expect(area.locator("article").filter({ hasText: "ACCOUNT-A-PRIVATE-APPOINTMENT" })).toHaveCount(0);
    await expect(area.getByText("لا توجد مواعيد قادمة.")).toBeVisible();

    await area.locator("form").getByPlaceholder("مثال: زيارة متابعة").fill("ACCOUNT-B-PRIVATE-APPOINTMENT");
    await area.locator("form").locator('input[type="date"]').fill(futureDay(41));
    await area.locator("form").getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(area.locator("article").filter({ hasText: "ACCOUNT-B-PRIVATE-APPOINTMENT" })).toHaveCount(1);
    await swapSyntheticSession(page, TEST_USERS.a);
    await expect(area).toBeVisible();
    await expect(area.locator("article").filter({ hasText: "ACCOUNT-B-PRIVATE-APPOINTMENT" })).toHaveCount(0);
    await expect(area.locator("article").filter({ hasText: "ACCOUNT-A-PRIVATE-APPOINTMENT" })).toHaveCount(1);
    expect(backend.rows.size).toBe(2);
  });

  test("reports failed cloud saves without claiming success or storing a phantom appointment", async ({ page }) => {
    const backend = createSyntheticSupabaseApi();
    await page.route("http://127.0.0.1:4173/_fake_supabase/**", backend.serve);
    await installSyntheticSession(page, TEST_USERS.a);
    await page.goto("/pregnancy");
    const area = page.locator(selector);
    await expect(area).toBeVisible();
    const form = area.locator("form");
    await form.getByPlaceholder("مثال: زيارة متابعة").fill("MUST-NOT-SAVE-WHILE-OFFLINE");
    await form.locator('input[type="date"]').fill(futureDay(50));
    backend.setWriteFailure(true);
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(form.getByRole("alert")).toContainText("تعذر حفظ أو تحميل المواعيد");
    await expect(area.locator("article")).toHaveCount(0);
    expect(backend.rows.size).toBe(0);

    backend.setWriteFailure(false);
    await form.getByRole("button", { name: "حفظ الموعد" }).click();
    await expect(area.locator("article").filter({ hasText: "MUST-NOT-SAVE-WHILE-OFFLINE" })).toHaveCount(1);
    await expect(form.getByText("تم الحفظ بنجاح.")).toBeVisible();
    expect(backend.rows.size).toBe(1);
  });
});
