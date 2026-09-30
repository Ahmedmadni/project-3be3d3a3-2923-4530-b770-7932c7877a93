import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Network, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";
import { MedicalDisclaimer } from "@/components/health/MedicalDisclaimer";

export const Route = createFileRoute("/admin/external-sources")({
  component: ExternalSourcesPage,
});

function ExternalSourcesPage() {
  const { t, lang } = useI18n();
  const q = useQuery({
    queryKey: ["admin", "external-sources"],
    queryFn: async () => {
      const [sources, engines, mappings] = await Promise.all([
        supabase
          .from("external_source_registry")
          .select("*")
          .order("trust_tier")
          .order("display_name"),
        supabase
          .from("clinical_engine_integrations")
          .select("*")
          .order("display_name"),
        supabase
          .from("terminology_mappings")
          .select("id,mapping_status,terminology_system"),
      ]);

      if (sources.error) throw sources.error;
      if (engines.error) throw engines.error;
      if (mappings.error) throw mappings.error;

      return {
        sources: sources.data ?? [],
        engines: engines.data ?? [],
        mappings: mappings.data ?? [],
      };
    },
  });

  if (q.isPending) {
    return <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  }
  if (q.error) {
    return <div className="rounded-3xl bg-destructive-soft p-5 text-sm text-destructive">{String(q.error)}</div>;
  }

  const approvedMappings = q.data.mappings.filter((mapping) => mapping.mapping_status === "approved");

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Network className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl font-extrabold">{t("admin.externalSources")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("admin.externalSourcesHint")}</p>
          </div>
        </div>
      </header>

      <MedicalDisclaimer text={t("medical.externalSourcesDisclaimer")} />

      <section className="grid gap-4 xl:grid-cols-2">
        {q.data.sources.map((source) => (
          <article key={source.id} className="glass rounded-3xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold">{source.display_name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{source.provider}</p>
              </div>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                {source.trust_tier}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label={t("admin.integrationMode")}>{source.integration_mode}</Info>
              <Info label={t("admin.externalLicense")}>{source.license_model ?? "—"}</Info>
              <Info label={t("admin.externalVerified")}>
                {source.last_verified_at
                  ? new Date(source.last_verified_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en")
                  : "—"}
              </Info>
              <Info label={t("admin.externalCredentials")}>
                {source.requires_credentials ? "Yes" : "No"}
              </Info>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Capability label={t("admin.externalClinicalUse")} on={source.may_supply_clinical_content} />
              <Capability label={t("admin.externalTerminologyUse")} on={source.may_supply_terminology} />
              <Capability label={t("admin.externalPopulationUse")} on={source.may_supply_population_data} />
            </div>

            {source.notes ? (
              <p className="mt-4 text-xs leading-6 text-muted-foreground">{source.notes}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={source.base_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <ExternalLink className="size-3.5" />
                {source.display_name}
              </a>
              {source.repository_url ? (
                <a
                  href={source.repository_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                >
                  <ExternalLink className="size-3.5" />
                  GitHub
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="flex items-center gap-2 font-extrabold">
          <ShieldCheck className="size-5 text-primary" />
          {t("admin.externalEngineStatus")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.externalNoPHI")}</p>
        <div className="mt-4 space-y-3">
          {q.data.engines.map((engine) => (
            <div key={engine.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{engine.display_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{engine.endpoint_base ?? "—"}</p>
                </div>
                <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                  {engine.enabled
                    ? engine.mode === "shadow_compare"
                      ? t("admin.externalShadow")
                      : engine.mode
                    : t("admin.externalDisabled")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h3 className="font-extrabold">{t("admin.externalMappings")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {approvedMappings.length
            ? String(approvedMappings.length) + " approved"
            : t("admin.externalNoMappings")}
        </p>
      </section>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
      <dt className="text-[11px] font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xs font-medium">{children}</dd>
    </div>
  );
}

function Capability({ label, on }: { label: string; on: boolean }) {
  return (
    <span className={on
      ? "rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary"
      : "rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground"
    }>
      {label}: {on ? "✓" : "—"}
    </span>
  );
}
