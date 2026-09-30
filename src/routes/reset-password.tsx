import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/health/cards";
import { Field, inputCls } from "@/components/health/wizard-ui";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة — مؤشر صحي" },
      { name: "description", content: "عيّن كلمة مرور جديدة لحسابك." },
      { property: "og:title", content: "تعيين كلمة مرور جديدة — مؤشر صحي" },
      { property: "og:description", content: "استعادة الوصول إلى حسابك." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      setMsg(t("auth.passwordMin"));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMsg(t("reset.updateFailed"));
      return;
    }

    nav({ to: "/account" });
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t("reset.title")} />

      {!ready ? (
        <p className="glass rounded-3xl p-6 text-sm leading-6 text-muted-foreground">
          {t("reset.openFromEmail")}
        </p>
      ) : (
        <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-5 sm:p-6">
          <Field label={t("reset.newPassword")}>
            <input
              type="password"
              dir="ltr"
              className={inputCls}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </Field>

          {msg ? <p className="text-sm text-destructive">{msg}</p> : null}

          <button className="w-full rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground">
            {t("reset.save")}
          </button>
        </form>
      )}
    </div>
  );
}
