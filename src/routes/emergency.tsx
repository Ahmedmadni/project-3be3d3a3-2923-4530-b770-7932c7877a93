import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Copy,
  HeartHandshake,
  HelpCircle,
  Phone,
  ShieldAlert,
  Siren,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { referenceQuery } from "@/lib/reference-data";
import { selectEmergencyContacts } from "@/engines/emergency-contacts";
import { appConfig } from "@/config/app";
import { localized, useI18n } from "@/i18n";
import {
  EMPTY_PROFESSIONAL_EMERGENCY_ASSESSMENT,
  EMPTY_PUBLIC_EMERGENCY_ANSWERS,
  buildProfessionalHandover,
  effectiveEmergencyRole,
  publicEmergencyAttentionItems,
  type EmergencyAnswer,
  type EmergencyUserRole,
  type ProfessionalEmergencyAssessment,
  type PublicEmergencyAnswers,
} from "@/lib/emergency-flow";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "حالة طارئة — مؤشر صحي" },
      { name: "description", content: "أرقام الطوارئ وإرشادات أثناء انتظار الإسعاف." },
      { property: "og:title", content: "حالة طارئة — مؤشر صحي" },
      { property: "og:description", content: "اتصل بالإسعاف فورًا في الحالات الطارئة." },
    ],
  }),
  component: Emergency,
});

function Emergency() {
  // Never block this screen on network: static fallback renders immediately.
  const { data } = useQuery(referenceQuery);
  const { lang, t } = useI18n();
  const contacts = selectEmergencyContacts(data?.emergencyContacts ?? [], appConfig.defaultCountry, null);
  const ambulance = contacts.find((c) => c.service_type === "ambulance")?.phone_number ?? appConfig.emergencyFallback.ambulance.number;
  const others = contacts.filter((c) => c.service_type !== "ambulance");

  const [role, setRole] = useState<EmergencyUserRole | null>(null);
  const [publicAnswers, setPublicAnswers] = useState<PublicEmergencyAnswers>(EMPTY_PUBLIC_EMERGENCY_ANSWERS);
  const [professional, setProfessional] = useState<ProfessionalEmergencyAssessment>(EMPTY_PROFESSIONAL_EMERGENCY_ASSESSMENT);
  const [copied, setCopied] = useState(false);

  const effectiveRole = effectiveEmergencyRole(role);
  const attentionItems = useMemo(() => publicEmergencyAttentionItems(publicAnswers), [publicAnswers]);
  const handover = useMemo(() => buildProfessionalHandover(professional), [professional]);

  const contactName = (contact: (typeof others)[number]) =>
    localized(contact as unknown as Record<string, unknown>, "name", lang) ?? contact.name_ar;

  const setPublicAnswer = (key: keyof PublicEmergencyAnswers, value: EmergencyAnswer) =>
    setPublicAnswers((prev) => ({ ...prev, [key]: value }));

  const setProfessionalField = <K extends keyof ProfessionalEmergencyAssessment>(
    key: K,
    value: ProfessionalEmergencyAssessment[K],
  ) => setProfessional((prev) => ({ ...prev, [key]: value }));

  const copyHandover = async () => {
    try {
      await navigator.clipboard.writeText(handover);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 animate-rise">
      <div className="sticky top-2 z-20 flex items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-3 text-center text-sm font-bold text-destructive-foreground shadow-danger">
        <ShieldAlert className="size-5 shrink-0" />
        {t("emergency.stickyWarning")}
      </div>

      <section className="glass rounded-[2rem] p-6 text-center md:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-destructive-soft text-destructive">
          <Siren className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">{t("emergency.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("emergency.description")}</p>

        <div className="mt-6 space-y-3">
          <a
            href={`tel:${ambulance}`}
            className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-4 font-bold text-destructive-foreground shadow-danger"
          >
            <Phone className="size-5" /> {t("emergency.callAmbulance", { number: ambulance })}
          </a>
          {others.map((contact) => (
            <a
              key={contact.id}
              href={`tel:${contact.phone_number}`}
              className="flex items-center justify-center gap-2 rounded-2xl bg-card py-4 font-semibold text-destructive ring-1 ring-border"
            >
              <Phone className="size-5" /> {contactName(contact)} {contact.phone_number}
            </a>
          ))}
        </div>
        <p className="mt-5 text-xs font-semibold text-destructive">{t("emergency.doNotRely")}</p>
      </section>

      <section className="glass rounded-[2rem] p-5 md:p-7">
        <div className="text-center">
          <h2 className="text-xl font-extrabold">{t("emergency.roleQuestion")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">{t("emergency.roleHint")}</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <RoleChoice
            selected={role === "public"}
            icon={UserRound}
            label={t("emergency.role.public")}
            onClick={() => setRole("public")}
          />
          <RoleChoice
            selected={role === "practitioner"}
            icon={Stethoscope}
            label={t("emergency.role.practitioner")}
            onClick={() => setRole("practitioner")}
          />
          <RoleChoice
            selected={role === "unsure"}
            icon={HelpCircle}
            label={t("emergency.role.unsure")}
            onClick={() => setRole("unsure")}
          />
        </div>
      </section>

      {effectiveRole === "public" ? (
        <PublicEmergencyPath
          answers={publicAnswers}
          onAnswer={setPublicAnswer}
          attentionItems={attentionItems}
          ambulance={ambulance}
        />
      ) : null}

      {effectiveRole === "practitioner" ? (
        <ProfessionalEmergencyPath
          assessment={professional}
          setField={setProfessionalField}
          handover={handover}
          copied={copied}
          onCopy={copyHandover}
          ambulance={ambulance}
        />
      ) : null}
    </div>
  );
}

function RoleChoice({
  selected,
  icon: Icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        selected
          ? "rounded-2xl bg-primary-soft p-5 text-start ring-2 ring-primary"
          : "rounded-2xl bg-card p-5 text-start ring-1 ring-border transition hover:ring-primary/40"
      }
    >
      <Icon className="size-6 text-primary" />
      <span className="mt-3 block text-sm font-bold">{label}</span>
    </button>
  );
}

function PublicEmergencyPath({
  answers,
  onAnswer,
  attentionItems,
  ambulance,
}: {
  answers: PublicEmergencyAnswers;
  onAnswer: (key: keyof PublicEmergencyAnswers, value: EmergencyAnswer) => void;
  attentionItems: string[];
  ambulance: string;
}) {
  const { t } = useI18n();
  const questions: { key: keyof PublicEmergencyAnswers; label: string }[] = [
    { key: "conscious", label: t("emergency.qConscious") },
    { key: "breathingNormally", label: t("emergency.qBreathing") },
    { key: "severeBleeding", label: t("emergency.qBleeding") },
    { key: "choking", label: t("emergency.qChoking") },
    { key: "seizure", label: t("emergency.qSeizure") },
    { key: "majorInjury", label: t("emergency.qMajorInjury") },
  ];

  return (
    <section className="glass rounded-[2rem] p-5 md:p-7">
      <h2 className="text-xl font-extrabold">{t("emergency.publicTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("emergency.publicHint")}</p>

      <div className="mt-5 space-y-3">
        {questions.map((question) => (
          <div key={question.key} className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <p className="text-sm font-bold">{question.label}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <AnswerButton selected={answers[question.key] === "yes"} onClick={() => onAnswer(question.key, "yes")}>{t("emergency.yes")}</AnswerButton>
              <AnswerButton selected={answers[question.key] === "no"} onClick={() => onAnswer(question.key, "no")}>{t("emergency.no")}</AnswerButton>
              <AnswerButton selected={answers[question.key] === "unknown"} onClick={() => onAnswer(question.key, "unknown")}>{t("emergency.unknown")}</AnswerButton>
            </div>
          </div>
        ))}
      </div>

      {attentionItems.length ? (
        <div className="mt-5 rounded-2xl bg-warning-soft p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-warning">
            <ClipboardList className="size-4" /> {t("emergency.attentionTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("emergency.attentionHint")}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {attentionItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-warning" />
                {t(`emergency.attention.${item}` as never)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href={`tel:${ambulance}`} className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 font-bold text-destructive-foreground">
          <Phone className="size-5" /> {t("emergency.callAmbulance", { number: ambulance })}
        </a>
        <Link to="/first-aid" className="flex items-center justify-center gap-2 rounded-2xl bg-card py-3.5 font-semibold ring-1 ring-border">
          <HeartHandshake className="size-5 text-primary" /> {t("emergency.reviewFirstAid")}
        </Link>
      </div>
    </section>
  );
}

function ProfessionalEmergencyPath({
  assessment,
  setField,
  handover,
  copied,
  onCopy,
  ambulance,
}: {
  assessment: ProfessionalEmergencyAssessment;
  setField: <K extends keyof ProfessionalEmergencyAssessment>(key: K, value: ProfessionalEmergencyAssessment[K]) => void;
  handover: string;
  copied: boolean;
  onCopy: () => void;
  ambulance: string;
}) {
  const { t } = useI18n();
  const yesNoUnknown = (key: "airwayConcern" | "breathingConcern" | "circulationConcern", label: string) => (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="text-sm font-bold">{label}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <AnswerButton selected={assessment[key] === "yes"} onClick={() => setField(key, "yes")}>{t("emergency.yes")}</AnswerButton>
        <AnswerButton selected={assessment[key] === "no"} onClick={() => setField(key, "no")}>{t("emergency.no")}</AnswerButton>
        <AnswerButton selected={assessment[key] === "unknown"} onClick={() => setField(key, "unknown")}>{t("emergency.unknown")}</AnswerButton>
      </div>
    </div>
  );

  return (
    <section className="glass rounded-[2rem] p-5 md:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Stethoscope className="size-5" /></span>
        <div>
          <h2 className="text-xl font-extrabold">{t("emergency.profTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("emergency.profHint")}</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{t("emergency.primaryAssessment")}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label={t("emergency.consciousness")}>
            <input className={inputClass} value={assessment.consciousness} onChange={(e) => setField("consciousness", e.target.value)} />
          </Field>
          <div className="md:col-span-2 grid gap-3 lg:grid-cols-3">
            {yesNoUnknown("airwayConcern", t("emergency.airwayConcern"))}
            {yesNoUnknown("breathingConcern", t("emergency.breathingConcern"))}
            {yesNoUnknown("circulationConcern", t("emergency.circulationConcern"))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">{t("emergency.vitals")}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("emergency.bpSys")}><NumberInput value={assessment.systolicBp} onChange={(v) => setField("systolicBp", v)} /></Field>
          <Field label={t("emergency.bpDia")}><NumberInput value={assessment.diastolicBp} onChange={(v) => setField("diastolicBp", v)} /></Field>
          <Field label={t("emergency.hr")}><NumberInput value={assessment.heartRate} onChange={(v) => setField("heartRate", v)} /></Field>
          <Field label={t("emergency.rr")}><NumberInput value={assessment.respiratoryRate} onChange={(v) => setField("respiratoryRate", v)} /></Field>
          <Field label={t("emergency.spo2")}><NumberInput value={assessment.spo2} onChange={(v) => setField("spo2", v)} /></Field>
          <Field label={t("emergency.temp")}><NumberInput value={assessment.temperature} onChange={(v) => setField("temperature", v)} step="0.1" /></Field>
          <Field label={t("emergency.glucose")}><NumberInput value={assessment.glucose} onChange={(v) => setField("glucose", v)} /></Field>
          <Field label={t("emergency.onset")}><input className={inputClass} value={assessment.onset} onChange={(e) => setField("onset", e.target.value)} /></Field>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Field label={t("emergency.allergies")}><input className={inputClass} value={assessment.allergies} onChange={(e) => setField("allergies", e.target.value)} /></Field>
        <Field label={t("emergency.medications")}><input className={inputClass} value={assessment.medications} onChange={(e) => setField("medications", e.target.value)} /></Field>
        <Field label={t("emergency.relevantHistory")}><textarea rows={3} className={inputClass} value={assessment.relevantHistory} onChange={(e) => setField("relevantHistory", e.target.value)} /></Field>
        <Field label={t("emergency.notes")}><textarea rows={3} className={inputClass} value={assessment.notes} onChange={(e) => setField("notes", e.target.value)} /></Field>
      </div>

      <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-border">
        <h3 className="font-bold">{t("emergency.handoverTitle")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("emergency.handoverHint")}</p>
        <pre dir="ltr" className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-background p-3 text-xs leading-6 ring-1 ring-border">{handover}</pre>
        <button type="button" onClick={onCopy} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("emergency.copied") : t("emergency.copyHandover")}
        </button>
      </div>

      <a href={`tel:${ambulance}`} className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 font-bold text-destructive-foreground">
        <Phone className="size-5" /> {t("emergency.callAmbulance", { number: ambulance })}
      </a>
    </section>
  );
}

function AnswerButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        selected
          ? "rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground"
          : "rounded-xl bg-background px-3 py-2.5 text-xs font-semibold ring-1 ring-border"
      }
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  step = "1",
}: {
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return <input type="number" inputMode="decimal" min="0" step={step} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />;
}

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20";
