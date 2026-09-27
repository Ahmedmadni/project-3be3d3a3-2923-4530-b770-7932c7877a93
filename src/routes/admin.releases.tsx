import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/admin/releases")({ component: ReleasesPage });

function ReleasesPage() {
  const access = useAdminAccess();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");

  const q = useQuery({
    queryKey: ["admin", "releases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_releases").select("*").order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_knowledge_release", { _version: version.trim(), _notes: notes.trim() });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(t("admin.saved"));
      setVersion(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "releases"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  return (
    <div className="space-y-5">
      <div><h2 className="text-2xl font-extrabold">{t("admin.releases")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("admin.releaseHint")}</p></div>
      {access.isAdmin ? (
        <div className="glass grid gap-3 rounded-3xl p-5 md:grid-cols-[200px_1fr_auto]">
          <input className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="2026.09.1" value={version} onChange={(e) => setVersion(e.target.value)} />
          <input className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm" placeholder="ملاحظات الإصدار" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="button" disabled={create.isPending || !version.trim()} onClick={() => create.mutate()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{t("admin.newRelease")}</button>
        </div>
      ) : null}
      {q.isPending ? <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div> : null}
      <div className="space-y-3">
        {(q.data ?? []).map((release) => (
          <article key={release.id} className="glass rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-bold">{release.version}</h3><p className="mt-1 text-sm text-muted-foreground">{release.notes || "—"}</p></div>
              <div className="text-left"><span className={release.is_demo ? "rounded-full bg-warning-soft px-2 py-1 text-xs text-warning" : "rounded-full bg-primary-soft px-2 py-1 text-xs text-primary"}>{release.is_demo ? "DEMO" : "Published"}</span><p className="mt-2 text-xs text-muted-foreground">{new Date(release.published_at).toLocaleString()}</p></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
