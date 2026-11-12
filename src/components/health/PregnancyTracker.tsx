import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Baby, CalendarDays, Check, Pencil, RefreshCw, ShieldCheck, Siren, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageVisualHeader } from "./PageVisualHeader";
import { pregnancyCopy, pregnancySources } from "@/data/pregnancy-copy";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { localDate, pregnancyProgress } from "@/lib/pregnancy";
import pregnancyImage from "@/assets/pregnancy-care.jpg";
import { PregnancyEducation } from "./PregnancyEducation";
import { PregnancyDateSettings, type PregnancyDateValues } from "./PregnancyDateSettings";
import { PregnancyAppointments } from "./PregnancyAppointments";

const moods = ["good", "okay", "tired"] as const;
const symptoms = ["nausea", "fatigue", "backache", "heartburn"] as const;

export function PregnancyTracker() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();
  const c = pregnancyCopy[lang];
  const cache = useQueryClient();
  const [today, setToday] = useState("");
  const [editing, setEditing] = useState(false);
  const [temporary, setTemporary] = useState<PregnancyDateValues | null>(null);
  const [mood, setMood] = useState<string>("okay");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    const refresh = () => setToday(localDate());
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const tracking = useQuery({
    queryKey: ["pregnancy-tracking", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("pregnancy_tracking").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const entries = useQuery({
    queryKey: ["pregnancy-entries", user?.id, today], enabled: Boolean(user && today),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("pregnancy_daily_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });
  const nextPlanned = useQuery({
    queryKey: ["pregnancy-next-planned", user?.id, today],
    enabled: Boolean(user && today),
    queryFn: async () => {
      if (!user || !today) return null;
      const { data, error } = await supabase.from("pregnancy_appointments")
        .select("appointment_date,appointment_time")
        .eq("user_id", user.id).eq("status", "planned")
        .gte("appointment_date", today)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true })
        .limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const profile = user ? tracking.data : temporary;
  useEffect(() => {
    setEditing(false);
    setTemporary(null);
    // Discard in-memory owner-specific pregnancy caches after sign-out/account changes.
    // Never expose another account's previous notes, appointments or dating results.
    const accountId = user?.id;
    cache.removeQueries({
      predicate: (query) =>
        ["pregnancy-tracking", "pregnancy-entries", "pregnancy-appointments", "pregnancy-next-planned"]
          .includes(String(query.queryKey[0])) && query.queryKey[1] !== accountId,
    });
  }, [user?.id, cache]);
  const todayEntry = entries.data?.find((e) => e.entry_date === today);
  useEffect(() => {
    setMood(todayEntry?.mood || "okay"); setSelected(todayEntry?.symptoms || []); setNotes(todayEntry?.notes || "");
  }, [todayEntry, user?.id, today]);
  const saveProfile = useMutation({
    mutationFn: async (value: PregnancyDateValues) => {
      if (!user) { setTemporary(value); return; }
      const { error } = await supabase.from("pregnancy_tracking").upsert({ ...value, user_id: user.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["pregnancy-tracking", user?.id] }); setEditing(false); },
  });
  const saveEntry = useMutation({
    mutationFn: async () => {
      if (!user || !today) throw new Error("Sign in required");
      const { error } = await supabase.from("pregnancy_daily_entries").upsert({ user_id: user.id, entry_date: today, mood, symptoms: selected, notes }, { onConflict: "user_id,entry_date" });
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["pregnancy-entries", user?.id] }),
  });
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("pregnancy_daily_entries").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["pregnancy-entries", user?.id] }),
  });
  const p = profile && today ? pregnancyProgress(profile.last_period, profile.clinician_due_date, today) : null;
  const dateLabel = (date: string) => new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
  const busy = loading || Boolean(user && tracking.isPending) || !today;
  const legacyUpcoming = profile?.next_appointment && profile.next_appointment >= today ? profile.next_appointment : null;
  const displayedNext = user && !nextPlanned.isPending && !nextPlanned.isError
    ? (nextPlanned.data?.appointment_date ?? null)
    : legacyUpcoming;

  return <div className="space-y-6">
    <PageVisualHeader title={c.title} subtitle={c.subtitle} image={pregnancyImage} imageAlt={c.title} className="[&_img]:object-left-top" />
    <div className="flex items-start gap-3 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
      <p className="leading-7">{user ? c.private : c.guest} {!user && <Link to="/auth" className="ms-2 font-bold text-primary underline">{c.signIn}</Link>}</p>
    </div>
    <section className="border-s-4 border-destructive bg-destructive-soft/50 p-4 sm:p-5" aria-label={c.warningTitle}>
      <h2 className="flex items-center gap-2 font-bold text-destructive"><Siren className="size-5" />{c.warningTitle}</h2>
      <p className="mt-2 text-sm leading-7">{c.warning}</p>
      <Button asChild variant="destructive" className="mt-3"><Link to="/emergency">{c.emergency}</Link></Button>
    </section>
    {busy ? <p role="status">{c.loading}</p> : tracking.isError ? <div role="alert"><p>{c.error}</p><Button onClick={() => tracking.refetch()} className="mt-3">{c.retry}</Button></div> : <>
      {!profile && <section className="border-y border-border py-6">
        <h2 className="text-xl font-extrabold">{c.personalize}</h2><p className="mb-5 mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{c.personalizeHelp}</p>
        <PregnancyDateSettings profile={null} today={today} pending={saveProfile.isPending} saveError={saveProfile.isError} onSave={(values) => saveProfile.mutate(values)} />
      </section>}
      <Dialog open={editing} onOpenChange={(open) => { if (!saveProfile.isPending) setEditing(open); }}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg">
          <DialogTitle className="pe-6 text-start">{c.personalize}</DialogTitle>
          <DialogDescription className="text-start leading-7">{c.personalizeHelp}</DialogDescription>
          {editing && <PregnancyDateSettings profile={profile} today={today} pending={saveProfile.isPending} saveError={saveProfile.isError} onSave={(values) => saveProfile.mutate(values)} onCancel={() => setEditing(false)} />}
        </DialogContent>
      </Dialog>
      {p && <>
        <section className="border-y border-border py-6">
          <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Baby className="size-6 text-primary" />{c.title}</h2><Button variant="outline" size="icon" title={c.personalize} aria-label={c.personalize} onClick={() => { saveProfile.reset(); setEditing(true); }}><Pencil /></Button></div>
          <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">
            <div><p className="text-sm text-muted-foreground">{c.week}</p><p className="mt-2 text-4xl font-extrabold text-primary" dir="ltr">{p.weeks}<span className="ms-2 text-base font-medium text-muted-foreground">+ {p.days} {c.days}</span></p></div>
            <div><p className="text-sm text-muted-foreground">{c.trimester}</p><p className="mt-3 text-lg font-bold">{c.trimesters[p.trimester]}</p></div>
            <div><p className="text-sm text-muted-foreground">{c.due}</p><p className="mt-3 font-bold">{dateLabel(p.due)}</p></div>
            <div><p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{c.next}</p>{user && nextPlanned.isError
              ? <div role="alert" className="mt-3 space-y-2"><p className="text-xs leading-6 text-destructive">{lang === "ar" ? "تعذر تحميل الموعد القادم. لا يمكن تأكيد عدم وجود مواعيد." : "Could not load the next appointment. An empty schedule cannot be confirmed."}</p><Button type="button" size="sm" variant="outline" onClick={() => nextPlanned.refetch()}>{c.retry}</Button></div>
              : <p className="mt-3 font-bold">{user && nextPlanned.isPending ? c.loading : displayedNext ? dateLabel(displayedNext) : c.noAppointment}</p>}</div>
          </div>
          <p className="mt-6 text-xs leading-6 text-muted-foreground">{profile?.clinician_due_date ? c.clinicalEstimate : c.estimate}</p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-primary"><RefreshCw className="size-3.5" />{c.autoUpdate} · {c.asOf} {dateLabel(today)}</p>
          {p.remaining <= 0 && <p role="status" className="mt-3 border-s-2 border-warning bg-warning-soft p-3 text-sm leading-7">{c.overdue}</p>}
        </section>
        <Tabs defaultValue="care" dir={lang === "ar" ? "rtl" : "ltr"}>
          <TabsList className="mb-5 grid h-auto w-full grid-cols-3 gap-1"><TabsTrigger className="h-auto min-h-12 whitespace-normal text-center text-xs sm:text-sm" value="care">{c.journey}</TabsTrigger><TabsTrigger className="h-auto min-h-12 whitespace-normal text-center text-xs sm:text-sm" value="appointments">{lang === "ar" ? "مواعيدي" : "My appointments"}</TabsTrigger><TabsTrigger className="h-auto min-h-12 whitespace-normal text-center text-xs sm:text-sm" value="daily">{c.daily}</TabsTrigger></TabsList>
          <TabsContent value="care" className="space-y-6">
            <div className="border-s-4 border-primary ps-4"><h2 className="font-bold">{c.firstDays}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{c.firstDaysBody}</p></div>
            <PregnancyEducation currentStage={p.trimester} completedWeeks={p.weeks} />
          </TabsContent>
          <TabsContent value="appointments" className="space-y-6"><PregnancyAppointments userId={user?.id ?? null} today={today} /></TabsContent>
          <TabsContent value="daily" className="space-y-6">
            {!user ? <p>{c.guestDaily} <Link to="/auth" className="font-bold text-primary underline">{c.signIn}</Link></p> : <>
              {entries.isPending ? <p role="status">{c.loading}</p> : entries.isError ? <div role="alert"><p>{c.error}</p><Button onClick={() => entries.refetch()}>{c.retry}</Button></div> : <>
                <form className="max-w-2xl space-y-5" onSubmit={(e) => { e.preventDefault(); saveEntry.mutate(); }}>
                  <fieldset><legend className="mb-3 text-lg font-bold">{c.dayTitle}</legend><div className="flex flex-wrap gap-2">{moods.map((value, i) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-4 py-3 text-sm"><input type="radio" name="pregnancy-mood" value={value} checked={mood === value} onChange={() => { setMood(value); saveEntry.reset(); }} />{c.moods[i]}</label>)}</div></fieldset>
                  <fieldset><legend className="mb-3 font-semibold">{c.symptoms}</legend><div className="grid gap-3 sm:grid-cols-2">{symptoms.map((value, i) => <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(value)} onChange={(e) => { setSelected(e.target.checked ? [...selected, value] : selected.filter((s) => s !== value)); saveEntry.reset(); }} />{c.symptomLabels[i]}</label>)}</div></fieldset>
                  <label htmlFor="pregnancy-notes" className="block space-y-2 text-sm font-medium"><span>{c.notes}</span><Textarea id="pregnancy-notes" value={notes} maxLength={2000} placeholder={c.notePlaceholder} onChange={(e) => { setNotes(e.target.value); saveEntry.reset(); }} /></label>
                  <Button type="submit" disabled={saveEntry.isPending}><Check />{c.saveDay}</Button>
                  {saveEntry.isSuccess && <p role="status" className="text-sm text-success">{c.savedDay}</p>}{saveEntry.isError && <p role="alert" className="text-sm text-destructive">{c.error}</p>}
                </form>
                <section className="border-t border-border pt-5"><h3 className="mb-4 font-bold">{c.history}</h3>{!entries.data?.length ? <p className="text-sm text-muted-foreground">{c.emptyHistory}</p> : <div className="divide-y divide-border">{entries.data.map((entry) => <article key={entry.id} className="flex items-start justify-between gap-4 py-4"><div className="min-w-0"><p className="text-sm font-bold">{dateLabel(entry.entry_date)} · {c.moods[moods.findIndex((m) => m === entry.mood)] || entry.mood}</p><p className="mt-1 text-sm text-muted-foreground">{entry.symptoms.map((s) => c.symptomLabels[symptoms.findIndex((v) => v === s)]).filter(Boolean).join(" · ")}</p>{entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{entry.notes}</p>}</div><Button size="icon" variant="ghost" title={c.delete} aria-label={c.delete} disabled={deleteEntry.isPending} onClick={() => { if (window.confirm(c.confirmDelete)) deleteEntry.mutate(entry.id); }}><Trash2 /></Button></article>)}</div>}{deleteEntry.isError && <p role="alert">{c.error}</p>}</section>
              </>}
            </>}
          </TabsContent>
        </Tabs>
      </>}
    </>}
    {!p && <PregnancyEducation />}
    {!p && !busy && today && <PregnancyAppointments userId={user?.id ?? null} today={today} />}
    <p className="border-t border-border pt-4 text-xs leading-6 text-muted-foreground">{c.safety}</p>
    <details className="text-xs text-muted-foreground"><summary className="cursor-pointer font-bold">{c.sources}</summary><ul className="mt-3 space-y-2" dir="ltr">{pregnancySources.map((s) => <li key={s.url}><a className="text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul></details>
  </div>;
}