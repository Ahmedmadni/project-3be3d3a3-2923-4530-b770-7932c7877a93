import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { grantableRoles, type Role } from "@/lib/governance";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const access = useAdminAccess();
  const { t } = useI18n();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "users"],
    enabled: access.isAdmin,
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("id,display_name,country_code,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("id,user_id,role"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      return { profiles: profiles.data ?? [], roles: roles.data ?? [] };
    },
  });

  const change = useMutation({
    mutationFn: async ({ userId, role, add }: { userId: string; role: Role; add: boolean }) => {
      if (add) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(t("admin.saved")); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  if (!access.isAdmin) return <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("admin.denied")}</div>;
  if (q.isPending) return <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (q.error) return <div className="rounded-3xl bg-destructive-soft p-5 text-sm text-destructive">{String(q.error)}</div>;

  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-extrabold">{t("admin.users")}</h2><p className="mt-1 text-sm text-muted-foreground">إدارة صلاحيات فريق المحتوى والمراجعة. لا يمكن للمستخدم تعديل أدواره بنفسه.</p></div>
      {(q.data?.profiles ?? []).map((profile) => {
        const current = (q.data?.roles ?? []).filter((r) => r.user_id === profile.id).map((r) => r.role as Role);
        const grantable = grantableRoles(access.roles as Role[], access.user!.id, profile.id);
        return (
          <article key={profile.id} className="glass rounded-3xl p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div><h3 className="font-bold">{profile.display_name || "مستخدم"}</h3><p className="mt-1 text-xs text-muted-foreground">{profile.id}</p></div>
              <span className="text-xs text-muted-foreground">{profile.country_code}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {current.map((role) => (
                <button key={role} type="button" disabled={!grantable.includes(role) || change.isPending} onClick={() => change.mutate({ userId: profile.id, role, add: false })}
                  className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">
                  {t(`role.${role}` as never)} ×
                </button>
              ))}
              {grantable.filter((role) => !current.includes(role)).map((role) => (
                <button key={role} type="button" disabled={change.isPending} onClick={() => change.mutate({ userId: profile.id, role, add: true })}
                  className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold ring-1 ring-border">
                  + {t(`role.${role}` as never)}
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
