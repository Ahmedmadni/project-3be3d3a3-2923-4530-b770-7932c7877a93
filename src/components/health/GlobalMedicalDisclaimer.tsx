import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n";

export function GlobalMedicalDisclaimer() {
  const { t } = useI18n();

  return (
    <aside
      className="mx-auto mt-8 w-full max-w-6xl px-4 pb-28 sm:px-5 md:pb-8"
      aria-label={t("medical.disclaimerTitle")}
    >
      <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 text-xs leading-5 text-muted-foreground">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <strong className="text-foreground">{t("medical.disclaimerTitle")}: </strong>
            {t("medical.disclaimerGlobal")}
          </div>
        </div>
      </div>
    </aside>
  );
}
