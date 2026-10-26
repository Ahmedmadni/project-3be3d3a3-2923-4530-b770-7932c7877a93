import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

export function localDate(date = new Date()): string { return format(date, "yyyy-MM-dd"); }

export function validPregnancyDates(lastPeriod: string, clinicianDueDate: string, today: string): boolean {
  const dates = [lastPeriod, today, ...(clinicianDueDate ? [clinicianDueDate] : [])];
  if (dates.some((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s) || !isValid(parseISO(s)) || format(parseISO(s), "yyyy-MM-dd") !== s)) return false;
  const age = differenceInCalendarDays(parseISO(today), parseISO(lastPeriod));
  if (age < 0 || age > 301) return false;
  if (clinicianDueDate) {
    const remaining = differenceInCalendarDays(parseISO(clinicianDueDate), parseISO(today));
    if (remaining < -21 || remaining > 280) return false;
  }
  return true;
}

export function pregnancyProgress(lastPeriod: string, clinicianDueDate: string | null, today: string) {
  const due = clinicianDueDate || format(addDays(parseISO(lastPeriod), 280), "yyyy-MM-dd");
  const start = clinicianDueDate ? addDays(parseISO(clinicianDueDate), -280) : parseISO(lastPeriod);
  const elapsed = Math.max(0, differenceInCalendarDays(parseISO(today), start));
  const weeks = Math.floor(elapsed / 7);
  return { due, weeks, days: elapsed % 7, trimester: weeks < 14 ? 0 : weeks < 28 ? 1 : 2, elapsed,
    remaining: differenceInCalendarDays(parseISO(due), parseISO(today)) };
}