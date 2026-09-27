import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/health/cards";
import { Field, inputCls } from "@/components/health/wizard-ui";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "تعيين كلمة مرور جديدة — مؤشر صحي" }, { name: "robots", content: "noindex" }] }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "PASSWORD_RECOVERY") setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setMsg(t("reset.short"));
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg(t("reset.failed"));
    nav({ to: "/account" });
  };
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t("reset.title")} />
      {!ready ? <p className="glass rounded-3xl p-6 text-sm text-muted-foreground">{t("reset.openLink")}</p> : (
        <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6">
          <Field label={t("reset.newPassword")}><input type="password" dir="ltr" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          {msg && <p className="text-sm text-destructive">{msg}</p>}
          <button className="w-full rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground">{t("reset.save")}</button>
        </form>
      )}
    </div>
  );
}
