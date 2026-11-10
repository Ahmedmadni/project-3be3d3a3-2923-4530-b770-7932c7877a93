import { useState } from "react";
import { Baby, CalendarDays, Check, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pregnancyCopy } from "@/data/pregnancy-copy";
import { useI18n } from "@/i18n";
import { pregnancyProgress, validPregnancyDates } from "@/lib/pregnancy";
import type { PregnancyTracking } from "@/types/medical";

export type PregnancyDateValues = Pick<PregnancyTracking, "last_period" | "clinician_due_date" | "estimated_conception_date" | "next_appointment">;

export function PregnancyDateSettings({ profile, today, pending, saveError, onSave, onCancel }: {
  profile: PregnancyDateValues | null | undefined;
  today: string;
  pending: boolean;
  saveError: boolean;
  onSave: (values: PregnancyDateValues) => void;
  onCancel?: () => void;
}) {
  const { lang } = useI18n();
  const c = pregnancyCopy[lang];
  const [period, setPeriod] = useState(profile?.last_period || "");
  const [conception, setConception] = useState(profile?.estimated_conception_date || "");
  const [due, setDue] = useState(profile?.clinician_due_date || "");
  const [appointment, setAppointment] = useState(profile?.next_appointment || "");
  const [submitted, setSubmitted] = useState(false);
  const validDating = validPregnancyDates(period, due, today);
  const valid = validPregnancyDates(period, due, today, conception);
  const preview = validDating ? pregnancyProgress(period, due || null, today) : null;
  const dateLabel = (date: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));

  return <form className="space-y-5" onSubmit={(event) => {
    event.preventDefault(); setSubmitted(true);
    if (valid) onSave({ last_period: period, estimated_conception_date: conception || null, clinician_due_date: due || null, next_appointment: appointment || null });
  }}>
    <p className="text-xs text-muted-foreground">{c.dateOnly}</p>
    <div className="grid min-w-0 gap-5 sm:grid-cols-2">
      <label className="min-w-0 space-y-2 text-sm font-medium" htmlFor="pregnancy-period"><span className="block">{c.period}</span><Input className="min-w-0 max-w-full" id="pregnancy-period" required type="date" max={today} value={period} onChange={(e) => setPeriod(e.target.value)} /></label>
      <label className="min-w-0 space-y-2 text-sm font-medium" htmlFor="pregnancy-conception"><span className="block">{c.conception}</span><Input className="min-w-0 max-w-full" id="pregnancy-conception" type="date" min={period || undefined} max={today} value={conception} aria-describedby="pregnancy-conception-help" onChange={(e) => setConception(e.target.value)} /><span id="pregnancy-conception-help" className="block text-xs font-normal leading-6 text-muted-foreground">{c.conceptionHelp}</span></label>
      <label className="min-w-0 space-y-2 text-sm font-medium" htmlFor="pregnancy-due"><span className="block">{c.clinician}</span><Input className="min-w-0 max-w-full" id="pregnancy-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <label className="min-w-0 space-y-2 text-sm font-medium" htmlFor="pregnancy-appointment"><span className="block">{c.appointment}</span><Input className="min-w-0 max-w-full" id="pregnancy-appointment" type="date" value={appointment} onChange={(e) => setAppointment(e.target.value)} /></label>
    </div>
    <section className="border-y border-border bg-primary-soft/40 px-4 py-5" aria-label={c.preview} aria-live="polite">
      <h3 className="flex items-center gap-2 font-bold"><Baby className="size-5 text-primary" />{c.preview}</h3>
      {preview ? <>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <div><dt className="text-xs text-muted-foreground">{c.week}</dt><dd className="mt-2 text-3xl font-extrabold text-primary">{preview.weeks}<span className="ms-2 text-sm font-medium">+ {preview.days} {c.days}</span></dd></div>
          <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{c.due}</dt><dd className="mt-2 text-sm font-bold leading-6">{dateLabel(preview.due)}</dd></div>
        </dl>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">{due ? c.clinicalEstimate : c.estimate}</p>
      </> : <p className="mt-3 text-sm text-muted-foreground">{c.previewEmpty}</p>}
      <p className="mt-3 flex items-center gap-2 text-xs font-medium text-primary"><RefreshCw className="size-3.5 shrink-0" />{c.autoUpdate} · {c.asOf} {dateLabel(today)}</p>
    </section>
    {(submitted && !valid || saveError) && <p role="alert" className="text-sm leading-6 text-destructive">{submitted && !valid ? (validDating ? c.conceptionError : c.dateError) : c.error}</p>}
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={pending}>{profile ? <Check /> : <Heart />}{profile ? c.save : c.begin}</Button>{onCancel && <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{c.cancel}</Button>}</div>
  </form>;
}