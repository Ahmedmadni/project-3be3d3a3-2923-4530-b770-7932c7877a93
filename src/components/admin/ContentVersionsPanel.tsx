import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { availableTransitions, type Role, type WorkflowStatus } from "@/lib/governance";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useI18n } from "@/i18n";

export function ContentVersionsPanel({ entityType }: { entityType: string }) {
  const access = useAdminAccess();
  const { t } = useI18n();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "versions", entityType],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_versions").select("*").eq("entity_type", entityType).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: WorkflowStatus }) => {
      if (to === "published") {
        const { error } = await supabase.rpc("publish_content_version", { _version_id: id });
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("content_versions").update({ status: to }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.saved"));
      qc.invalidateQueries({ queryKey: ["admin", "versions", entityType] });
      qc.invalidateQueries({ queryKey: ["admin", entityType] });
      qc.invalidateQueries({ queryKey: ["reference-data"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  if (q.isPending || !q.data?.length) return null;

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-base font-bold">{t("admin.tab.versions")}</h3>
      <div className="space-y-3">
        {q.data.map((version) => {
          const snapshot = version.snapshot && typeof version.snapshot === "object" && !Array.isArray(version.snapshot) ? version.snapshot as Record<string, unknown> : {};
          const label = String(snapshot["name_ar"] ?? snapshot["title_ar"] ?? snapshot["question_ar"] ?? snapshot["code"] ?? version.entity_id);
          const transitions = availableTransitions(access.roles as Role[], version.status);
          return (
            <article key={version.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">v{version.version} · {version.status} · {new Date(version.created_at).toLocaleString()}</p>
                  {version.change_reason ? <p className="mt-2 text-xs text-muted-foreground">{version.change_reason}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {transitions.map((to) => (
                    <button key={to} type="button" disabled={move.isPending} onClick={() => move.mutate({ id: version.id, to })}
                      className="rounded-xl bg-background px-3 py-2 text-xs font-semibold text-primary ring-1 ring-border">
                      {t(`action.${to}` as never)}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
