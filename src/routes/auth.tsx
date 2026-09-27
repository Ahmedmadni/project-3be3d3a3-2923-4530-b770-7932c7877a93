import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/health/cards";
import { Field, inputCls } from "@/components/health/wizard-ui";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [{ title: "تسجيل الدخول — مؤشر صحي" }, { name: "description", content: "سجّل الدخول أو أنشئ حسابًا لحفظ فحوصاتك." }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";
const schema = z.object({ email: z.string().trim().email(), password: z.string().min(8) });

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { t } = useI18n();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/account";
  const titles: Record<Mode, string> = { signin: t("auth.signin"), signup: t("auth.signup"), forgot: t("auth.forgot") };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (mode === "forgot") {
      const r = z.string().email().safeParse(email.trim());
      if (!r.success) return setMsg({ ok: false, text: t("auth.invalidEmail") });
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      return setMsg(error ? { ok: false, text: t("auth.sendFailed") } : { ok: true, text: t("auth.resetSent") });
    }
    const p = schema.safeParse({ email, password });
    if (!p.success) {
      const short = password.length < 8;
      return setMsg({ ok: false, text: short ? t("auth.shortPassword") : t("auth.invalidEmail") });
    }
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: p.data.email, password: p.data.password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() || undefined } } });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (!data.session) return setMsg({ ok: true, text: t("auth.createdConfirm") });
    } else {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) return setMsg({ ok: false, text: t("auth.invalidCredentials") });
    }
    nav({ to: safeRedirect });
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={titles[mode]} subtitle={t("auth.optional")} />
      <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6">
        {mode === "signup" && <Field label={t("auth.name")} hint={t("auth.nameOptional")}><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>}
        <Field label={t("auth.email")}><input type="email" dir="ltr" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        {mode !== "forgot" && <Field label={t("auth.password")}><input type="password" dir="ltr" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></Field>}
        {msg && <p role="alert" className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
        <button disabled={busy} className="w-full rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {busy ? t("auth.busy") : titles[mode]}
        </button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "signin" && <button type="button" onClick={() => setMode("signin")} className="text-primary">{t("auth.haveAccount")}</button>}
          {mode !== "signup" && <button type="button" onClick={() => setMode("signup")} className="text-primary">{t("auth.newAccount")}</button>}
          {mode === "signin" && <button type="button" onClick={() => setMode("forgot")} className="text-muted-foreground">{t("auth.forgotLink")}</button>}
        </div>
      </form>
    </div>
  );
}
