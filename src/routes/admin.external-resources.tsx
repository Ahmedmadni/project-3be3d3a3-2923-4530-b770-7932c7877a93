import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/admin/external-resources")({
  component: ExternalResourcesPage,
});

function ExternalResourcesPage() {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["admin", "external-resource-registry"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_resource_registry")
        .select("*")
        .order("provider", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold">{t("admin.externalResources")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.externalResourcesHint")}</p>
      </div>

      {query.isPending ? (
        <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
      ) : query.error ? (
        <div className="rounded-3xl bg-destructive-soft p-5 text-sm text-destructive">{String(query.error)}</div>
      ) : (
        <div className="space-y-3">
          {query.data.map((item) => {
            const approvedReference =
              item.owner_verified &&
              item.trust_level === "official" &&
              item.clinical_use_status !== "not_approved";

            return (
              <article key={item.id} className="glass rounded-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{item.name}</h3>
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                        {item.resource_type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.provider}</p>
                  </div>

                  <span className={approvedReference
                    ? "inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success"
                    : "inline-flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning"
                  }>
                    {approvedReference ? <ShieldCheck className="size-3.5" /> : <ShieldX className="size-3.5" />}
                    {item.clinical_use_status}
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                  <Row label={t("admin.trustLevel")} value={item.trust_level} />
                  <Row label={t("admin.ownerVerified")} value={item.owner_verified ? t("common.yes") : t("common.no")} />
                  <Row label={t("admin.requiresCredentials")} value={item.requires_credentials ? t("common.yes") : t("common.no")} />
                  <Row label={t("admin.commercial")} value={item.commercial ? t("common.yes") : t("common.no")} />
                </dl>

                {item.notes ? <p className="mt-4 text-xs leading-5 text-muted-foreground">{item.notes}</p> : null}

                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
                >
                  {t("admin.openExternalSource")} <ExternalLink className="size-3.5" />
                </a>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-border">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
