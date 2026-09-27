import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { availableTransitions, normalizeStatus, type Role, type WorkflowStatus } from "@/lib/governance";
import { useI18n } from "@/i18n";

export type AdminField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "checkbox" | "select" | "url";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
};

export type AdminRow = Record<string, unknown>;

export function AdminEntityManager({
  table,
  title,
  description,
  fields,
  defaultValues,
  primaryField,
  orderBy,
  governed = true,
}: {
  table: string;
  title: string;
  description?: string;
  fields: AdminField[];
  defaultValues: AdminRow;
  primaryField: string;
  orderBy?: string;
  governed?: boolean;
}) {
  const { t } = useI18n();
  const access = useAdminAccess();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdminRow>(defaultValues);

  const query = useQuery({
    queryKey: ["admin", table],
    queryFn: async () => {
      let q = supabase.from(table as never).select("*");
      if (orderBy) q = q.order(orderBy as never, { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AdminRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!access.user) throw new Error("AUTH_REQUIRED");
      const payload = Object.fromEntries(fields.map((f) => [f.key, form[f.key]]));
      if (editing?.["id"]) {
        if (governed && normalizeStatus(String(editing["review_status"] ?? "draft")) === "published") {
          const nextVersion = Number(editing["version"] ?? 1) + 1;
          const snapshot = { ...editing, ...payload, review_status: "draft", version: nextVersion };
          const { error } = await supabase.from("content_versions").insert({
            entity_type: table,
            entity_id: String(editing["id"]),
            version: nextVersion,
            status: "draft",
            snapshot: snapshot as never,
            change_reason: String(form["change_reason"] ?? "تعديل محتوى منشور"),
            created_by: access.user.id,
          });
          if (error) throw error;
          return "version";
        }
        const { error } = await supabase.from(table as never).update(payload as never).eq("id" as never, editing["id"] as never);
        if (error) throw error;
        return "updated";
      }
      const { error } = await supabase.from(table as never).insert(payload as never);
      if (error) throw error;
      return "created";
    },
    onSuccess: (kind) => {
      toast.success(kind === "version" ? t("admin.draftCreated") : t("admin.saved"));
      qc.invalidateQueries({ queryKey: ["admin", table] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  const transition = useMutation({
    mutationFn: async ({ row, to }: { row: AdminRow; to: WorkflowStatus }) => {
      const { error } = await supabase.from(table as never)
        .update({ review_status: to } as never)
        .eq("id" as never, row["id"] as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("admin.saved"));
      qc.invalidateQueries({ queryKey: ["admin", table] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return query.data ?? [];
    return (query.data ?? []).filter((row) =>
      [row[primaryField], row["code"], row["name_en"], row["title"], row["title_en"]]
        .filter((v) => typeof v === "string")
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [query.data, search, primaryField]);

  const roles = access.roles as Role[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {access.roles.some((r) => ["content_editor", "admin", "super_admin"].includes(r)) ? (
          <button type="button" onClick={() => { setEditing(null); setForm({ ...defaultValues }); setOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> {t("admin.new")}
          </button>
        ) : null}
      </div>

      <label className="glass relative block rounded-2xl">
        <Search className="absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("common.search")} className="w-full bg-transparent py-3 pr-11 pl-4 text-sm outline-none" />
      </label>

      {query.isPending ? <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div> : null}
      {query.error ? <div className="rounded-3xl bg-destructive-soft p-5 text-sm text-destructive">{String(query.error)}</div> : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const id = String(row["id"]);
          const status = governed ? normalizeStatus(String(row["review_status"] ?? "draft")) : null;
          const transitions = governed ? availableTransitions(roles, status ?? "draft") : [];
          return (
            <article key={id} className="glass rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">{String(row[primaryField] ?? "—")}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {row["code"] ? <span>{String(row["code"])}</span> : null}
                    {status ? <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{t(`status.${status}` as never)}</span> : null}
                    {row["is_demo"] === true ? <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning">{t("common.demo")}</span> : null}
                    {row["version"] ? <span>v{String(row["version"])}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {access.roles.some((r) => ["content_editor", "admin", "super_admin"].includes(r)) ? (
                    <button type="button" onClick={() => { setEditing(row); setForm({ ...defaultValues, ...row }); setOpen(true); }} className="inline-flex items-center gap-1 rounded-xl bg-card px-3 py-2 text-xs font-semibold ring-1 ring-border">
                      <Pencil className="size-3.5" /> {t("common.edit")}
                    </button>
                  ) : null}
                  {transitions.map((to) => (
                    <button key={to} type="button" disabled={transition.isPending} onClick={() => transition.mutate({ row, to })} className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-primary ring-1 ring-border">
                      {t(`action.${to}` as never)}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
        {!query.isPending && !rows.length ? <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">{t("admin.noItems")}</div> : null}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle>{editing ? t("common.edit") : t("common.create")} — {title}</DialogTitle>
            <DialogDescription>
              {editing && governed && normalizeStatus(String(editing["review_status"] ?? "draft")) === "published" ? t("admin.publishedLocked") : description}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <AdminFieldControl
                key={field.key}
                field={field}
                value={form[field.key]}
                onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
              />
            ))}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="rounded-xl bg-card px-4 py-2.5 text-sm font-semibold ring-1 ring-border" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
              <button type="button" disabled={save.isPending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50" onClick={() => save.mutate()}>{t("common.save")}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminFieldControl({ field, value, onChange }: { field: AdminField; value: unknown; onChange: (value: unknown) => void }) {
  const cls = "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20";
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 rounded-xl bg-card p-3 text-sm font-medium ring-1 ring-border">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {field.label}
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className="block text-sm font-medium">{field.label}
        <select className={cls} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className="block text-sm font-medium sm:col-span-2">{field.label}
        <textarea className={`${cls} min-h-28`} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || null)} placeholder={field.placeholder} />
      </label>
    );
  }
  return (
    <label className="block text-sm font-medium">{field.label}
      <input
        className={cls}
        type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
        required={field.required}
        value={value == null ? "" : String(value)}
        onChange={(e) => onChange(field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
        placeholder={field.placeholder}
      />
    </label>
  );
}
