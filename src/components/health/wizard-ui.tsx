import { Check, Search } from "lucide-react";
import type { QuestionWithOptions, Severity } from "@/types/medical";
import { cn } from "@/lib/utils";
import { localized, useI18n } from "@/i18n";

export function ProgressStepper({ steps, current }: { steps: string[]; current: number }) {
  const { t } = useI18n();
  const stepText = t("checker.step", { current: current + 1, total: steps.length });
  return (
    <div aria-label={stepText}>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-primary">{steps[current]}</span>
        <span>{stepText}</span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= current ? "bg-gradient-primary" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}

export function SymptomChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition-all",
        selected ? "bg-primary text-primary-foreground ring-primary shadow-glow" : "bg-card ring-border hover:bg-primary-soft",
      )}
    >
      {selected && <Check className="size-4" />}
      {label}
    </button>
  );
}

export function SymptomSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, dir } = useI18n();
  return (
    <label className="relative block">
      <Search className={cn("pointer-events-none absolute inset-y-0 my-auto size-5 text-muted-foreground", dir === "rtl" ? "right-4" : "left-4")} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("checker.searchPlaceholder")}
        className={cn(
          "w-full rounded-2xl border border-input bg-card py-3.5 text-sm outline-none focus:ring-2 focus:ring-ring",
          dir === "rtl" ? "pr-12 pl-4" : "pl-12 pr-4",
        )}
      />
    </label>
  );
}

const sev: { v: Severity; key: "checker.mild" | "checker.moderate" | "checker.severe"; c: string }[] = [
  { v: "mild", key: "checker.mild", c: "bg-success text-primary-foreground" },
  { v: "moderate", key: "checker.moderate", c: "bg-warning text-primary-foreground" },
  { v: "severe", key: "checker.severe", c: "bg-destructive text-destructive-foreground" },
];

export function SeveritySelector({ value, onChange }: { value: Severity | ""; onChange: (v: Severity) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("checker.severity")}>
      {sev.map((s) => (
        <button
          key={s.v}
          type="button"
          role="radio"
          aria-checked={value === s.v}
          onClick={() => onChange(s.v)}
          className={cn("rounded-xl py-2.5 text-sm font-medium ring-1 ring-border transition-colors", value === s.v ? s.c : "bg-card hover:bg-muted")}
        >
          {t(s.key)}
        </button>
      ))}
    </div>
  );
}

export function OptionGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-20 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition-colors",
            value === o.value ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border hover:bg-primary-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function QuestionCard({ question, value, onChange }: { question: QuestionWithOptions; value: string; onChange: (v: string) => void }) {
  const { lang, t } = useI18n();
  const questionText = localized(question as unknown as Record<string, unknown>, "question", lang) ?? t("common.notTranslated");
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="mb-3 font-medium">{questionText}</p>
      <OptionGroup
        options={question.options.map((o) => ({
          value: o.value,
          label: localized(o as unknown as Record<string, unknown>, "label", lang) ?? t("common.notTranslated"),
        }))}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}{hint && <span className="text-muted-foreground"> — {hint}</span>}</span>
      {children}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";
