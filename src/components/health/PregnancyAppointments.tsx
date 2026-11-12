import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarPlus, CheckCircle2, FileDown, FileUp, Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { pregnancyAppointmentLabels } from "@/data/pregnancy-appointment-labels";
import {
  appointmentCalendarIcs, appointmentsByTimeline, collectAppointmentPages, mergeGuestAppointments, parseAppointmentBackup,
  APPOINTMENT_BACKUP_FORMAT, MAX_APPOINTMENT_BACKUP_BYTES, validAppointment,
  validAppointmentStatus,
  type PregnancyAppointmentKind, type PregnancyAppointmentRecord, type PregnancyAppointmentStatus,
} from "@/lib/pregnancy-appointments";

type AppointmentFields = Pick<PregnancyAppointmentRecord, "title" | "appointment_date" | "appointment_time" | "kind" | "notes">;
type Operation =
  | { action: "save"; record: PregnancyAppointmentRecord; editing: boolean }
  | { action: "status"; id: string; status: PregnancyAppointmentStatus }
  | { action: "delete"; id: string };

function downloadFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AppointmentCards({ list, c, labelDate, pending, onEdit, onAction, onCalendar }: {
  list: PregnancyAppointmentRecord[];
  c: (typeof pregnancyAppointmentLabels)[keyof typeof pregnancyAppointmentLabels];
  labelDate: (date: string) => string;
  pending: boolean;
  onEdit: (entry: PregnancyAppointmentRecord) => void;
  onAction: (operation: Operation) => void;
  onCalendar: (entry: PregnancyAppointmentRecord) => void;
}) {
    return <div className="grid gap-3 md:grid-cols-2">
      {list.map((entry) => <article key={entry.id} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-primary">{c[entry.kind]}</span>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">{c[entry.status]}</span>
        </div>
        <h4 className="mt-3 break-words font-bold leading-7">{entry.title}</h4>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><CalendarClock className="size-4 shrink-0" />
          {labelDate(entry.appointment_date)}{entry.appointment_time ? " · " + entry.appointment_time : ""}
        </p>
        {entry.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{entry.notes}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(entry)} disabled={pending}><Pencil className="size-4" />{c.edit}</Button>
          {entry.status !== "completed" && <Button type="button" variant="outline" size="sm" disabled={pending}
            onClick={() => onAction({ action: "status", id: entry.id, status: "completed" })}><CheckCircle2 className="size-4" />{c.done}</Button>}
          {entry.status !== "planned" && <Button type="button" variant="outline" size="sm" disabled={pending}
            onClick={() => onAction({ action: "status", id: entry.id, status: "planned" })}><RotateCcw className="size-4" />{c.restore}</Button>}
          {entry.status === "planned" && <Button type="button" variant="outline" size="sm" disabled={pending}
            onClick={() => onAction({ action: "status", id: entry.id, status: "cancelled" })}><XCircle className="size-4" />{c.cancel}</Button>}
          <Button type="button" variant="outline" size="sm" onClick={() => onCalendar(entry)}><CalendarPlus className="size-4" />{c.calendar}</Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={pending}
            onClick={() => { if (window.confirm(c.confirmDelete)) onAction({ action: "delete", id: entry.id }); }}>
            <Trash2 className="size-4" />{c.remove}
          </Button>
        </div>
      </article>)}
    </div>;
  }

/** Owner-scoped cloud records; guest appointments exist only in React memory. */
export function PregnancyAppointments({ userId, today }: { userId: string | null; today: string }) {
  const { lang } = useI18n();
  const c = pregnancyAppointmentLabels[lang];
  const qc = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const userScopeRef = useRef(userId);
  const importEpochRef = useRef(0);
  userScopeRef.current = userId;
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [guest, setGuest] = useState<PregnancyAppointmentRecord[]>([]);
  const [showUpcoming, setShowUpcoming] = useState(12);
  const [showHistory, setShowHistory] = useState(12);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(today);
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<PregnancyAppointmentKind>("visit");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // Abort any import whose file read completes after the account changes.
    importEpochRef.current += 1;
    setImportBusy(false);
    setGuest([]);
    setShowUpcoming(12);
    setShowHistory(12);
    setEditingId(null);
    setTitle("");
    setDay(today);
    setTime("");
    setKind("visit");
    setNotes("");
    setFormError(false);
    setFeedback("");
    setImportError("");
    setImportMessage("");
  }, [userId]); // Never carry guest information into a different account.

  const query = useQuery({
    queryKey: ["pregnancy-appointments", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return [];
      const rows = await collectAppointmentPages(async (start, end) => {
        const { data, error } = await supabase
          .from("pregnancy_appointments")
          .select("id,title,appointment_date,appointment_time,kind,notes,status")
          .eq("user_id", userId)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true })
          .order("id", { ascending: true })
          .range(start, end);
        if (error) throw error;
        return data ?? [];
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time ? row.appointment_time.slice(0, 5) : null,
        kind: (["visit", "test", "vaccination", "other"].includes(row.kind) ? row.kind : "other") as PregnancyAppointmentKind,
        notes: row.notes,
        status: (validAppointmentStatus(row.status) ? row.status : "planned") as PregnancyAppointmentStatus,
      }));
    },
  });

  const items: PregnancyAppointmentRecord[] = userId ? (query.data ?? []) : guest;
  const { upcoming, history } = useMemo(() => appointmentsByTimeline(items, today), [items, today]);

  const mutation = useMutation({
    mutationFn: async (operation: Operation) => {
      if (!userId) {
        if (operation.action === "save") {
          setGuest((rows) => operation.editing
            ? rows.map((item) => item.id === operation.record.id ? operation.record : item)
            : [...rows, operation.record]);
        } else if (operation.action === "status") {
          setGuest((rows) => rows.map((item) => item.id === operation.id ? { ...item, status: operation.status } : item));
        } else {
          setGuest((rows) => rows.filter((item) => item.id !== operation.id));
        }
        return;
      }

      if (operation.action === "save") {
        const entry = operation.record;
        const fields = {
          title: entry.title.trim(),
          appointment_date: entry.appointment_date,
          appointment_time: entry.appointment_time,
          kind: entry.kind,
          notes: entry.notes,
        };
        const result = operation.editing
          ? await supabase.from("pregnancy_appointments").update(fields).eq("id", entry.id).eq("user_id", userId).select("id").single()
          : await supabase.from("pregnancy_appointments").insert({ ...fields, user_id: userId }).select("id").single();
        if (result.error || !result.data) throw result.error || new Error("Appointment not saved");
      } else if (operation.action === "status") {
        const { error, data } = await supabase.from("pregnancy_appointments")
          .update({ status: operation.status }).eq("id", operation.id).eq("user_id", userId).select("id").single();
        if (error || !data) throw error || new Error("Appointment not updated");
      } else {
        const { error, data } = await supabase.from("pregnancy_appointments")
          .delete().eq("id", operation.id).eq("user_id", userId).select("id").single();
        if (error || !data) throw error || new Error("Appointment not deleted");
      }
    },
    onSuccess: async (_data, operation) => {
      // The mutation may finish after sign-out or a switch to a different user.
      // Invalidate only the original user's records and never show a success
      // banner or reset a different account's current form.
      if (userId) await Promise.all([
        qc.invalidateQueries({ queryKey: ["pregnancy-appointments", userId] }),
        qc.invalidateQueries({ queryKey: ["pregnancy-next-planned", userId] }),
      ]);
      if (userScopeRef.current !== userId) return;
      setFeedback(operation.action === "delete" ? c.removed : c.saved);
      if (operation.action === "save") resetForm();
    },
  });

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDay(today);
    setTime("");
    setKind("visit");
    setNotes("");
    setFormError(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (importBusy) return;
    setFeedback("");
    mutation.reset();
    const fields: AppointmentFields = {
      title: title.trim(),
      appointment_date: day,
      appointment_time: time || null,
      kind,
      notes,
    };
    if (!validAppointment(fields)) {
      setFormError(true);
      return;
    }
    setFormError(false);
    const id = editingId || crypto.randomUUID();
    mutation.mutate({
      action: "save",
      editing: Boolean(editingId),
      record: { ...fields, id, status: editingId ? items.find((i) => i.id === id)?.status ?? "planned" : "planned" },
    });
  }

  function startEdit(entry: PregnancyAppointmentRecord) {
    mutation.reset();
    setFeedback("");
    setFormError(false);
    setEditingId(entry.id);
    setTitle(entry.title);
    setDay(entry.appointment_date);
    setTime(entry.appointment_time || "");
    setKind(entry.kind);
    setNotes(entry.notes);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formRef.current?.querySelector<HTMLInputElement>("#pregnancy-appointment-title")?.focus({ preventScroll: true });
  }

  function exportCalendar(entry: PregnancyAppointmentRecord) {
    downloadFile("health-appointment-" + entry.appointment_date + ".ics",
      appointmentCalendarIcs(entry), "text/calendar;charset=utf-8");
  }

  function exportBackup() {
    // Explicit user action only; never background-sync these private records.
    downloadFile("health-appointments-backup-" + today + ".json",
      JSON.stringify({ format: APPOINTMENT_BACKUP_FORMAT, exported_on: today, records: items }, null, 2), "application/json;charset=utf-8");
  }


  async function importGuestBackup(file: File) {
    // Guest-only explicit import. Never upload, cache, or persist the file.
    if (userScopeRef.current !== null || importBusy) return;
    const currentEpoch = ++importEpochRef.current;
    setImportBusy(true);
    setImportError("");
    setImportMessage("");
    try {
      if (file.size > MAX_APPOINTMENT_BACKUP_BYTES) {
        throw new Error("Backup too large");
      }
      const parsed = parseAppointmentBackup(await file.text());
      if (userScopeRef.current !== null || currentEpoch !== importEpochRef.current) return;
      const merged = mergeGuestAppointments(guest, parsed, () => crypto.randomUUID());
      setGuest(merged.records);
      setImportMessage(lang === "ar"
        ? "تم استعادة " + merged.added + " موعد في جلسة الضيف المؤقتة."
        : "Restored " + merged.added + " appointments into this temporary guest session.");
    } catch {
      if (userScopeRef.current === null && currentEpoch === importEpochRef.current) {
        setImportError(c.importError);
      }
    } finally {
      if (currentEpoch === importEpochRef.current) setImportBusy(false);
    }
  }

  const kinds: PregnancyAppointmentKind[] = ["visit", "test", "vaccination", "other"];
  const labelDate = (date: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
    year: "numeric", month: "long", day: "numeric",
  }).format(new Date(date + "T12:00:00"));


  return <section className="min-w-0 space-y-6" aria-label={c.title}>
    <header className="space-y-2"><h2 className="flex items-center gap-2 text-xl font-extrabold">
      <CalendarClock className="size-6 text-primary" aria-hidden="true" />{c.title}
    </h2><p className="text-sm leading-7 text-muted-foreground">{c.intro}</p></header>
    <p className="border-s-4 border-primary bg-primary-soft/30 p-3 text-sm leading-7">
      {userId ? c.signed : c.login} {!userId && <Link to="/auth" className="font-bold text-primary underline">
        {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
      </Link>}
    </p>
    <p className="text-xs leading-6 text-muted-foreground">{c.legacy}</p>

    {userId && query.isPending && <p role="status">{c.loading}</p>}
    {userId && query.isError ? <div role="alert" className="space-y-3 border-s-4 border-destructive p-4">
      <p className="text-sm leading-7">{c.error}</p>
      <Button type="button" variant="outline" onClick={() => query.refetch()}>{c.retry}</Button>
    </div> : userId && query.isPending ? null : <>
      <form ref={formRef} onSubmit={submit} className="space-y-4 scroll-mt-8 rounded-xl border border-border bg-muted/30 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold"><CalendarPlus className="size-5 text-primary" />{editingId ? c.edit : c.add}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium sm:col-span-2"><span className="block">{c.titleLabel}</span>
            <Input id="pregnancy-appointment-title" required maxLength={120} placeholder={c.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium"><span className="block">{c.date}</span>
            <Input required type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium"><span className="block">{c.time}</span>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2"><span className="block">{c.type}</span>
            <select className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={kind} onChange={(e) => setKind(e.target.value as PregnancyAppointmentKind)}>
              {kinds.map((value) => <option key={value} value={value}>{c[value]}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2"><span className="block">{c.notes}</span>
            <Textarea value={notes} maxLength={1000} placeholder={c.notesPlaceholder} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={mutation.isPending || importBusy}><CalendarPlus className="size-4" />{c.save}</Button>
          {editingId && <Button type="button" variant="outline" onClick={resetForm} disabled={mutation.isPending || importBusy}>{c.cancelEdit}</Button>}
        </div>
        {formError && <p role="alert" className="text-sm text-destructive">{c.invalid}</p>}
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{c.error}</p>}
        {feedback && <p role="status" className="text-sm text-success">{feedback}</p>}
      </form>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          {!!items.length && <Button type="button" variant="outline" disabled={importBusy} onClick={exportBackup}>
            <FileDown className="size-4" />{c.backup}
          </Button>}
          {!userId && <>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label={c.importBackup}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void importGuestBackup(file);
              }}
            />
            <Button type="button" variant="outline" disabled={importBusy} onClick={() => importRef.current?.click()}>
              <FileUp className="size-4" />{importBusy ? c.importBusy : c.importBackup}
            </Button>
          </>}
        </div>
        {!!items.length && <p className="text-xs leading-6 text-muted-foreground">{c.backupHelp}</p>}
        {!userId && <p className="text-xs leading-6 text-muted-foreground">{c.importHelp}</p>}
        {importError && <p role="alert" className="text-sm leading-7 text-destructive">{importError}</p>}
        {importMessage && <p role="status" className="text-sm leading-7 text-success">{importMessage}</p>}
      </div>

      {upcoming[0] && <section className="rounded-xl border-s-4 border-primary bg-primary-soft/30 p-4">
        <p className="text-xs font-bold text-primary">{c.next}</p>
        <p className="mt-2 font-bold">{upcoming[0].title} · {labelDate(upcoming[0].appointment_date)}
          {upcoming[0].appointment_time ? " · " + upcoming[0].appointment_time : ""}</p>
      </section>}

      <section className="space-y-3"><h3 className="font-extrabold">{c.upcoming} ({upcoming.length})</h3>
        {upcoming.length ? <AppointmentCards list={upcoming.slice(0, showUpcoming)} c={c} labelDate={labelDate} pending={mutation.isPending || importBusy} onEdit={startEdit} onAction={(operation) => mutation.mutate(operation)} onCalendar={exportCalendar} /> : <p className="text-sm text-muted-foreground">{c.emptyUpcoming}</p>}
        {upcoming.length > showUpcoming && <Button type="button" variant="outline" onClick={() => setShowUpcoming((n) => n + 12)}>{c.showMore} ({upcoming.length - showUpcoming})</Button>}
      </section>
      <section className="space-y-3"><h3 className="font-extrabold">{c.past} ({history.length})</h3>
        {history.length ? <AppointmentCards list={history.slice(0, showHistory)} c={c} labelDate={labelDate} pending={mutation.isPending || importBusy} onEdit={startEdit} onAction={(operation) => mutation.mutate(operation)} onCalendar={exportCalendar} /> : <p className="text-sm text-muted-foreground">{c.emptyPast}</p>}
        {history.length > showHistory && <Button type="button" variant="outline" onClick={() => setShowHistory((n) => n + 12)}>{c.showMore} ({history.length - showHistory})</Button>}
      </section>
      <p className="border-s-2 border-warning ps-3 text-xs leading-6 text-muted-foreground">{c.calendarHelp} {c.timeHint}</p>
    </>}
    <p className="border-s-2 border-destructive ps-3 text-xs leading-6 text-muted-foreground">{c.safety}</p>
  </section>;
}
