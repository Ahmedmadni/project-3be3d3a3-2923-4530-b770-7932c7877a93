import { Check, Search } from "lucide-react";
import type { QuestionWithOptions, Severity } from "@/types/medical";
import { cn } from "@/lib/utils";

export function ProgressStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div aria-label={`الخطوة ${current + 1} من ${steps.length}`}>
      <div className="mb-2 flex justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-primary">{steps[current]}</span>
        <span>الخطوة {current + 1} من {steps.length}</span>
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
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute inset-y-0 right-4 my-auto size-5 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ابحث عن عرض مثل الصداع، الدوخة، ألم البطن..."
        className="w-full rounded-2xl border border-input bg-card py-3.5 pr-12 pl-4 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

const sev: { v: Severity; l: string; c: string }[] = [
  { v: "mild", l: "خفيف", c: "bg-success text-primary-foreground" },
  { v: "moderate", l: "متوسط", c: "bg-warning text-primary-foreground" },
  { v: "severe", l: "شديد", c: "bg-destructive text-destructive-foreground" },
];
export function SeveritySelector({ value, onChange }: { value: Severity | ""; onChange: (v: Severity) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="مستوى الشدة">
      {sev.map((s) => (
        <button key={s.v} type="button" role="radio" aria-checked={value === s.v} onClick={() => onChange(s.v)}
          className={cn("rounded-xl py-2.5 text-sm font-medium ring-1 ring-border transition-colors", value === s.v ? s.c : "bg-card hover:bg-muted")}>
          {s.l}
        </button>
      ))}
    </div>
  );
}

export function OptionGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={cn("min-w-20 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition-colors", value === o.value ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border hover:bg-primary-soft")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function QuestionCard({ question, value, onChange }: { question: QuestionWithOptions; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <p className="mb-3 font-medium">{question.question_ar}</p>
      <OptionGroup options={question.options.map((o) => ({ value: o.value, label: o.label_ar }))} value={value} onChange={onChange} />
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
