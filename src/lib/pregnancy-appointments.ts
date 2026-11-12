import { addDays, format, isValid, parseISO } from "date-fns";

/** This is appointment organisation only; no medical or risk decisions. */
import type { PregnancyAppointmentKind, PregnancyAppointmentRecord, PregnancyAppointmentStatus } from "@/types/medical";
export type { PregnancyAppointmentKind, PregnancyAppointmentRecord, PregnancyAppointmentStatus } from "@/types/medical";

const kinds = new Set<PregnancyAppointmentKind>(["visit", "test", "vaccination", "other"]);
const statuses = new Set<PregnancyAppointmentStatus>(["planned", "completed", "cancelled"]);

export function validAppointmentDate(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const parsed = parseISO(input);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === input;
}
export function validAppointmentTime(input: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input);
}

export function validAppointment(record: Pick<PregnancyAppointmentRecord, "title" | "appointment_date" | "appointment_time" | "kind" | "notes">): boolean {
  return record.title.trim().length > 0 && record.title.trim().length <= 120 &&
    record.notes.length <= 1000 && validAppointmentDate(record.appointment_date) &&
    (record.appointment_time === null || validAppointmentTime(record.appointment_time)) &&
    kinds.has(record.kind);
}

export function appointmentsByTimeline(records: PregnancyAppointmentRecord[], today: string) {
  const chronological = [...records].sort((a, b) =>
    a.appointment_date.localeCompare(b.appointment_date) ||
    (a.appointment_time ?? "").localeCompare(b.appointment_time ?? "") ||
    a.id.localeCompare(b.id));
  return {
    upcoming: chronological.filter((i) => i.status === "planned" && i.appointment_date >= today),
    history: chronological.filter((i) => i.status !== "planned" || i.appointment_date < today).reverse(),
  };
}

export function validAppointmentStatus(status: string): status is PregnancyAppointmentStatus {
  return statuses.has(status as PregnancyAppointmentStatus);
}

/**
 * On-demand, explicit .ics calendar export with a generic event title to avoid
 * exposing pregnancy or medical notes in calendar and notification previews.
 * Timed entries use floating local time (interpreted in calendar's time zone).
 * Alarm delivery depends entirely on the user's calendar import and preferences.
 */
export function appointmentCalendarIcs(
  entry: Pick<PregnancyAppointmentRecord, "id" | "appointment_date" | "appointment_time">,
  now = new Date(),
): string {
  if (!validAppointmentDate(entry.appointment_date) ||
    (entry.appointment_time !== null && !validAppointmentTime(entry.appointment_time))) {
    throw new Error("Invalid date for calendar export");
  }
  const date = entry.appointment_date.replaceAll("-", "");
  const tomorrow = format(addDays(parseISO(entry.appointment_date), 1), "yyyyMMdd");
  const time = entry.appointment_time?.replace(":", "") ?? null;
  const start = time ? "DTSTART:" + date + "T" + time + "00" : "DTSTART;VALUE=DATE:" + date;
  // For an appointment with a specified time, use a fixed 60-minute placeholder.
  const hour = time ? Number(time.slice(0, 2)) : 0;
  const minute = time ? Number(time.slice(2, 4)) : 0;
  const end = time ? format(addDays(parseISO(entry.appointment_date), hour === 23 ? 1 : 0), "yyyyMMdd") +
    "T" + String((hour + 1) % 24).padStart(2, "0") + String(minute).padStart(2, "0") + "00" : tomorrow;
  const endLine = time ? "DTEND:" + end : "DTEND;VALUE=DATE:" + end;
  const uid = entry.id.replace(/[^a-zA-Z0-9-]/g, "") || "appointment";
  const utcStamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Health App//Appointments//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", "UID:" + uid + "@health-appointments",
    "DTSTAMP:" + utcStamp, start, endLine,
    "SUMMARY:Health appointment",
    "DESCRIPTION:Please check your private appointment notes in the health app.",
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Health appointment reminder",
    "TRIGGER:-P1D", "END:VALARM", "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}


/**
 * Supabase can cap result sets; fetch sequential stable pages so an explicit
 * backup never silently contains only the first 200 appointments.
 * Fail explicitly beyond the safety limit instead of claiming a full export.
 */
export async function collectAppointmentPages<T>(
  fetchPage: (start: number, endInclusive: number) => Promise<readonly T[]>,
  pageSize = 200,
  maxRecords = 5000,
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 ||
      !Number.isSafeInteger(maxRecords) || maxRecords < 1) {
    throw new Error("Invalid appointment pagination limits");
  }
  const all: T[] = [];
  for (let start = 0; start <= maxRecords; start += pageSize) {
    const page = await fetchPage(start, start + pageSize - 1);
    if (page.length > pageSize || all.length + page.length > maxRecords) {
      throw new Error("Appointment record limit exceeded; no partial backup available");
    }
    all.push(...page);
    if (page.length < pageSize) return all;
  }
  throw new Error("Appointment record limit exceeded; no partial backup available");
}


/**
 * Explicit, memory-only guest backup recovery. The file is never uploaded.
 * Accepts the original unversioned export and the v1 branded export.
 * IDs are regenerated by the guest UI, preventing ID collisions with other accounts.
 */
export const APPOINTMENT_BACKUP_FORMAT = "health-appointments-v1";
export const MAX_APPOINTMENT_BACKUP_BYTES = 16 * 1024 * 1024;
export const MAX_APPOINTMENT_BACKUP_RECORDS = 5000;

export function parseAppointmentBackup(text: string): PregnancyAppointmentRecord[] {
  if (new TextEncoder().encode(text).byteLength > MAX_APPOINTMENT_BACKUP_BYTES) {
    throw new Error("Appointment backup exceeds the maximum supported size");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON appointment backup");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid appointment backup container");
  }
  const value = payload as Record<string, unknown>;
  if (value.format !== undefined && value.format !== APPOINTMENT_BACKUP_FORMAT) {
    throw new Error("Unknown appointment backup format");
  }
  if (!Array.isArray(value.records) || value.records.length > MAX_APPOINTMENT_BACKUP_RECORDS) {
    throw new Error("Invalid appointment backup records");
  }
  if (value.exported_on !== undefined &&
      (typeof value.exported_on !== "string" || !validAppointmentDate(value.exported_on))) {
    throw new Error("Invalid appointment backup date");
  }

  return value.records.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Invalid appointment backup row " + (index + 1));
    }
    const row = entry as Record<string, unknown>;
    if (
      typeof row.title !== "string" ||
      typeof row.appointment_date !== "string" ||
      !(row.appointment_time === null || typeof row.appointment_time === "string") ||
      typeof row.kind !== "string" ||
      typeof row.notes !== "string" ||
      typeof row.status !== "string" ||
      !validAppointmentStatus(row.status)
    ) {
      throw new Error("Invalid appointment backup row " + (index + 1));
    }
    const record: PregnancyAppointmentRecord = {
      // ID from a supplied file cannot be trusted to identify another user's data.
      id: "import-" + index,
      title: row.title.trim(),
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      kind: row.kind as PregnancyAppointmentKind,
      notes: row.notes,
      status: row.status,
    };
    if (!validAppointment(record)) {
      throw new Error("Invalid appointment backup row " + (index + 1));
    }
    return record;
  });
}

/** De-duplicate guest-only restored records without using imported IDs. */
export function mergeGuestAppointments(
  existing: readonly PregnancyAppointmentRecord[],
  incoming: readonly PregnancyAppointmentRecord[],
  newId: () => string,
): { records: PregnancyAppointmentRecord[]; added: number } {
  const fingerprint = (r: PregnancyAppointmentRecord) => JSON.stringify([
    r.title, r.appointment_date, r.appointment_time, r.kind, r.notes, r.status,
  ]);
  const fingerprints = new Set(existing.map(fingerprint));
  const result = [...existing];
  let added = 0;
  if (existing.length > MAX_APPOINTMENT_BACKUP_RECORDS ||
      incoming.length > MAX_APPOINTMENT_BACKUP_RECORDS) {
    throw new Error("Too many appointments to import");
  }
  for (const candidate of incoming) {
    if (!validAppointment(candidate) || !validAppointmentStatus(candidate.status)) {
      throw new Error("Invalid incoming appointment");
    }
    const key = fingerprint(candidate);
    if (fingerprints.has(key)) continue;
    if (result.length >= MAX_APPOINTMENT_BACKUP_RECORDS) {
      throw new Error("Too many appointments to import");
    }
    fingerprints.add(key);
    result.push({ ...candidate, id: newId() });
    added++;
  }
  return { records: result, added };
}
