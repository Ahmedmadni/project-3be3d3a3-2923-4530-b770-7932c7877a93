import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/health/cards";
import { Field, inputCls } from "@/components/health/wizard-ui";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مؤشر صحي" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا لحفظ فحوصاتك." },
      { property: "og:title", content: "تسجيل الدخول — مؤشر صحي" },
      { property: "og:description", content: "حساب اختياري لحفظ سجل الفحوصات." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const safeRedirect =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/account";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMsg(null);

    const validEmail = z.string().trim().email().safeParse(email.trim());
    if (!validEmail.success) {
      setMsg({ ok: false, text: t("auth.invalidEmail") });
      return;
    }

    if (mode === "forgot") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      setMsg(
        error
          ? { ok: false, text: t("auth.sendFailed") }
          : { ok: true, text: t("auth.resetSent") },
      );
      return;
    }

    if (password.length < 8) {
      setMsg({ ok: false, text: t("auth.passwordMin") });
      return;
    }

    setBusy(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: name.trim() || undefined },
        },
      });
      setBusy(false);

      if (error) {
        setMsg({ ok: false, text: error.message });
        return;
      }
      if (!data.session) {
        setMsg({ ok: true, text: t("auth.signupConfirm") });
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);

      if (error) {
        setMsg({ ok: false, text: t("auth.invalidCredentials") });
        return;
      }
    }

    nav({ to: safeRedirect });
  };

  const title =
    mode === "signin"
      ? t("auth.signin")
      : mode === "signup"
        ? t("auth.signup")
        : t("auth.forgot");

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={title} subtitle={t("auth.optional")} />

      <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-5 sm:p-6">
        {mode === "signup" ? (
          <Field label={t("auth.name")} hint={t("auth.nameOptional")}>
            <input
              className={inputCls}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoComplete="name"
            />
          </Field>
        ) : null}

        <Field label={t("auth.email")}>
          <input
            type="email"
            dir="ltr"
            className={inputCls}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </Field>

        {mode !== "forgot" ? (
          <Field label={t("auth.password")}>
            <input
              type="password"
              dir="ltr"
              className={inputCls}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </Field>
        ) : null}

        {msg ? (
          <p role="alert" className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>
            {msg.text}
          </p>
        ) : null}

        <button
          disabled={busy}
          className="w-full rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          {busy ? t("auth.running") : title}
        </button>

        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "signin" ? (
            <button type="button" onClick={() => setMode("signin")} className="text-primary">
              {t("auth.haveAccount")}
            </button>
          ) : null}
          {mode !== "signup" ? (
            <button type="button" onClick={() => setMode("signup")} className="text-primary">
              {t("auth.createNew")}
            </button>
          ) : null}
          {mode === "signin" ? (
            <button type="button" onClick={() => setMode("forgot")} className="text-muted-foreground">
              {t("auth.forgotLink")}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
