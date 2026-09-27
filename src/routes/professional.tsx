import { createFileRoute } from "@tanstack/react-router";
import { GitBranch, ClipboardList, AlertOctagon, Workflow, Calculator, FileText, Pill, Library } from "lucide-react";
import { PageHeader } from "@/components/health/cards";
import { ProfessionalBadge } from "@/components/health/badges";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/professional")({
  head: () => ({ meta: [{ title: "الوضع المهني — مؤشر صحي" }, { name: "description", content: "أدوات للأطباء والتمريض والمتخصصين الصحيين." }] }),
  component: Professional,
});

const tools = [
  ["Differential Diagnosis", GitBranch], ["Clinical Assessment", ClipboardList], ["Red Flags", AlertOctagon],
  ["Clinical Algorithms", Workflow], ["Medical Calculators", Calculator], ["Guidelines", FileText],
  ["Drug Reference", Pill], ["Professional Medical Library", Library],
] as const;

function Professional() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t("professional.title")} subtitle={t("professional.subtitle")}><div className="mt-3"><ProfessionalBadge /></div></PageHeader>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tools.map(([name, Icon]) => (
          <div key={name} className="glass rounded-3xl p-5" dir="ltr">
            <Icon className="size-6 text-accent" />
            <p className="mt-3 text-sm font-bold">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground" dir="auto">{t("professional.soon")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
