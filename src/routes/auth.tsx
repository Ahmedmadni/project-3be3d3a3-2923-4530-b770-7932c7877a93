import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/health/cards";
import { Field, inputCls } from "@/components/health/wizard-ui";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مؤشر صحي" },
      { name: "description", content: "سجّل الدخول أو أنشئ حسابًا لحفظ فحوصاتك." },
      { property: "og:title", content: "تسجيل الدخول — مؤشر صحي" },
      { property: "og:description", content: "حساب اختياري لحفظ سجل الفحوصات." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";
const schema = z.object({ email: z.string().trim().email("بريد إلكتروني غير صحيح"), password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل") });

function AuthPage() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/account";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (mode === "forgot") {
      const r = z.string().email().safeParse(email.trim());
      if (!r.success) return setMsg({ ok: false, text: "بريد إلكتروني غير صحيح" });
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      return setMsg(error ? { ok: false, text: "تعذر الإرسال، حاول لاحقًا." } : { ok: true, text: "إذا كان البريد مسجلًا فستصلك رسالة لاستعادة كلمة المرور." });
    }
    const p = schema.safeParse({ email, password });
    if (!p.success) return setMsg({ ok: false, text: p.error.issues[0]?.message ?? "بيانات غير صحيحة" });
    setBusy(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: p.data.email, password: p.data.password, options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() || undefined } } });
      setBusy(false);
      if (error) return setMsg({ ok: false, text: error.message });
      if (!data.session) return setMsg({ ok: true, text: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيده." });
    } else {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) return setMsg({ ok: false, text: "البريد أو كلمة المرور غير صحيحة." });
    }
    nav({ to: safeRedirect });
  };

  const titles: Record<Mode, string> = { signin: "تسجيل الدخول", signup: "إنشاء حساب", forgot: "استعادة كلمة المرور" };
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={titles[mode]} subtitle="الحساب اختياري — يمكنك فحص الأعراض كضيف." />
      <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6">
        {mode === "signup" && <Field label="الاسم" hint="اختياري"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>}
        <Field label="البريد الإلكتروني"><input type="email" dir="ltr" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        {mode !== "forgot" && <Field label="كلمة المرور"><input type="password" dir="ltr" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></Field>}
        {msg && <p role="alert" className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
        <button disabled={busy} className="w-full rounded-2xl bg-gradient-primary py-3.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {busy ? "جارٍ التنفيذ..." : titles[mode]}
        </button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "signin" && <button type="button" onClick={() => setMode("signin")} className="text-primary">لدي حساب</button>}
          {mode !== "signup" && <button type="button" onClick={() => setMode("signup")} className="text-primary">إنشاء حساب جديد</button>}
          {mode === "signin" && <button type="button" onClick={() => setMode("forgot")} className="text-muted-foreground">نسيت كلمة المرور؟</button>}
        </div>
      </form>
    </div>
  );
}
