import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  appointmentCalendarIcs,
  appointmentsByTimeline,
  collectAppointmentPages,
  validAppointment,
  validAppointmentDate,
  validAppointmentTime,
  type PregnancyAppointmentRecord,
} from "./pregnancy-appointments";

const item = (id: string, date: string, time: string | null = null, status: PregnancyAppointmentRecord["status"] = "planned"): PregnancyAppointmentRecord => ({
  id, title: "Private antenatal note", appointment_date: date, appointment_time: time,
  notes: "Sensitive personal question", kind: "visit", status,
});

describe("pregnancy appointment planner", () => {
  it("validates actual calendar dates and optional times", () => {
    expect(validAppointmentDate("2028-02-29")).toBe(true);
    expect(validAppointmentDate("2027-02-29")).toBe(false);
    expect(validAppointmentDate("2026-13-01")).toBe(false);
    expect(validAppointmentTime("23:59")).toBe(true);
    expect(validAppointmentTime("25:60")).toBe(false);
    expect(validAppointment(item("a", "2026-12-03"))).toBe(true);
    expect(validAppointment({ ...item("b", "2026-12-03"), title: " ".repeat(20) })).toBe(false);
    expect(validAppointment({ ...item("b", "2026-12-03"), notes: "x".repeat(1001) })).toBe(false);
  });

  it("separates upcoming planned appointments from history without changing the input", () => {
    const records = [
      item("c", "2026-12-03", "15:00"),
      item("a", "2026-10-11"),
      item("b", "2026-12-03", "08:00"),
      item("d", "2026-12-08", null, "cancelled"),
      item("e", "2026-12-05", null, "completed"),
    ];
    const original = records.map((i) => i.id).join(",");
    const view = appointmentsByTimeline(records, "2026-11-12");
    expect(view.upcoming.map((i) => i.id)).toEqual(["b", "c"]);
    expect(view.history.map((i) => i.id)).toEqual(["d", "e", "a"]);
    expect(records.map((i) => i.id).join(",")).toBe(original);
  });

  it("creates date-only and timed calendar files without exposing private data", () => {
    const stamp = new Date("2026-11-12T10:20:30.000Z");
    const allDay = appointmentCalendarIcs(item("safe-id", "2026-12-03"), stamp);
    expect(allDay).toContain("DTSTART;VALUE=DATE:20261203");
    expect(allDay).toContain("DTEND;VALUE=DATE:20261204");
    expect(allDay).toContain("DTSTAMP:20261112T102030Z");
    expect(allDay).toContain("TRIGGER:-P1D");
    expect(allDay).not.toContain("Private antenatal note");
    expect(allDay).not.toContain("Sensitive personal question");
    expect(allDay).not.toContain("Pregnancy");
    const timed = appointmentCalendarIcs(item("b", "2026-12-03", "23:30"), stamp);
    expect(timed).toContain("DTSTART:20261203T233000");
    expect(timed).toContain("DTEND:20261204T003000");
    expect(timed).not.toContain("Private antenatal note");
  });


  it("fetches every stable page without silently truncating a full backup", async () => {
    const records = Array.from({ length: 451 }, (_, id) => ({ id }));
    const calls: Array<[number, number]> = [];
    const fetchPage = async (start: number, end: number) => {
      calls.push([start, end]);
      return records.slice(start, end + 1);
    };
    const full = await collectAppointmentPages(fetchPage, 200);
    expect(full).toEqual(records);
    expect(calls).toEqual([[0, 199], [200, 399], [400, 599]]);
  });

  it("handles an exact full page and empty result without extra data loss", async () => {
    const records = Array.from({ length: 400 }, (_, id) => id);
    const full = await collectAppointmentPages(async (start, end) => records.slice(start, end + 1), 200);
    expect(full).toEqual(records);
    expect(await collectAppointmentPages(async () => [], 200)).toEqual([]);
  });

  it("refuses oversized, invalid, and failed page loads instead of claiming a partial backup", async () => {
    const records = Array.from({ length: 5 }, (_, id) => id);
    await expect(collectAppointmentPages(async (start, end) => records.slice(start, end + 1), 2, 4))
      .rejects.toThrow(/limit exceeded/);
    await expect(collectAppointmentPages(async () => [1, 2, 3], 2)).rejects.toThrow(/limit exceeded/);
    await expect(collectAppointmentPages(async (start) => {
      if (start > 0) throw new Error("database unavailable");
      return [1, 2];
    }, 2)).rejects.toThrow("database unavailable");
    await expect(collectAppointmentPages(async () => [], 0)).rejects.toThrow(/Invalid/);
  });

  it("rejects an invalid calendar export", () => {
    expect(() => appointmentCalendarIcs(item("a", "2026-02-30"))).toThrow();
    expect(() => appointmentCalendarIcs(item("a", "2026-12-03", "24:30"))).toThrow();
  });

  it("has all four owner-scoped policies, no public access and no background job", () => {
    const migration = readFileSync(new URL("../../drizzle/migrations/0002_pregnancy_appointments.sql", import.meta.url), "utf8");
    for (const action of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect(migration).toMatch(new RegExp("CREATE POLICY pregnancy_appointments_owner_" + action.toLowerCase() + " ON public.pregnancy_appointments FOR " + action));
    }
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.pregnancy_appointments FROM anon");
    expect(migration).toContain("ON DELETE CASCADE");
    expect(migration).not.toContain("cron.schedule");
  });
});
