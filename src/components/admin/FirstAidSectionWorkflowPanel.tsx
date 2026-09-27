import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { availableTransitions, normalizeStatus, type Role, type WorkflowStatus } from "@/lib/governance";

export function FirstAidSectionWorkflowPanel() {
  const access = useAdminAccess();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "first-aid-section-workflow"],
    queryFn: async () => {
      const [topics, rows] = await Promise.all([
        supabase.from("first_aid_topics").select("id,title_ar"),
        supabase.from("first_aid_sections").select("id,topic_id,section_type,title_ar,review_status").order("topic_id").order("sort_order"),
      ]);
      if (topics.error) throw topics.error;
      if (rows.error) throw rows.error;
      const topicNames = new Map((topics.data ?? []).map((topic) => [topic.id, topic.title_ar]));
      return (rows.data ?? []).map((row) => ({ ...row, topicName: topicNames.get(row.topic_id) ?? "—" }));
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: WorkflowStatus }) => {
      const { error } = await supabase.from("first_aid_sections").update({ review_status: to }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث حالة مراجعة قسم الإسعاف.");
      qc.invalidateQueries({ queryKey: ["admin", "first-aid-section-workflow"] });
      qc.invalidateQueries({ queryKey: ["admin", "first-aid-sections"] });
      qc.invalidateQueries({ queryKey: ["admin", "versions", "first_aid_sections"] });
      qc.invalidateQueries({ queryKey: ["first-aid-topics"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة"),
  });

  if (q.isPending || !q.data?.length) return null;

  return (
    <section className="mt-6 glass rounded-3xl p-5">
      <h3 className="font-bold">مراجعة أقسام الإسعافات الأولية</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        المحتوى لا يصبح منشورًا إلا عبر مسار المراجعة والصلاحيات المطبقة في قاعدة البيانات.
      </p>
      <div className="mt-4 space-y-2">
        {q.data.map((row) => {
          const status = normalizeStatus(row.review_status);
          const transitions = availableTransitions(access.roles as Role[], status);
          return (
            <div key={row.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{row.topicName} · {row.title_ar}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.section_type} · {status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {transitions.map((to) => (
                    <button
                      key={to}
                      type="button"
                      disabled={move.isPending}
                      onClick={() => move.mutate({ id: row.id, to })}
                      className="rounded-xl bg-background px-3 py-2 text-xs font-semibold text-primary ring-1 ring-border disabled:opacity-50"
                    >
                      {to}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
