import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL(
    "../components/health/ReminderReliabilityCard.tsx",
    import.meta.url,
  ),
  "utf8",
);

const journal = readFileSync(
  new URL("../routes/journal.tsx", import.meta.url),
  "utf8",
);

const dailyDashboard = readFileSync(
  new URL(
    "../components/health/DailyHealthDashboardSection.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("reminder reliability UI", () => {
  it("reads only operational reminder-delivery metadata", () => {
    expect(component).toContain('.from("medication_reminder_deliveries")');
    expect(component).toContain(
      '.select("id,status,scheduled_for,sent_at,error_code,created_at")',
    );
    expect(component).not.toContain("medication_name");
    expect(component).not.toContain("dose_text");
    expect(component).not.toContain("schedule_text");
  });

  it("distinguishes this browser endpoint from other account devices", () => {
    expect(component).toContain("currentBackgroundMedicationReminderEndpoint");
    expect(component).toContain("item.endpoint === currentEndpoint");
    expect(component).toContain("هذا الجهاز");
  });

  it("does not treat no recent delivery as a failure", () => {
    expect(component).toContain(
      "عدم وجود إرسال حديث لا يعني وجود عطل",
    );
    expect(component).toContain("No recent delivery does not imply a fault");
  });

  it("provides device-level enable disable and refresh controls", () => {
    expect(component).toContain("enableBackgroundMedicationReminders");
    expect(component).toContain("disableBackgroundMedicationReminders");
    expect(component).toContain("تحديث الحالة");
  });

  it("is visible in both the journal and daily dashboard", () => {
    expect(journal).toContain("<ReminderReliabilityCard />");
    expect(dailyDashboard).toContain(
      "<ReminderReliabilityCard compact />",
    );
  });
});
