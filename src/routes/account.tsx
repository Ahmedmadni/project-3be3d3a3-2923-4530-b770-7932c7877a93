import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound, History, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, LoadingState } from "@/components/health/cards";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي — مؤشر صحي" },
      { name: "description", content: "إدارة حسابك وسجل الفحوصات." },
      { property: "og:title", content: "حسابي — مؤشر صحي" },
      { property: "og:description", content: "حسابك الشخصي في مؤشر صحي." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  if (loading) return <LoadingState />;
  if (!user) return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="حسابي" />
      <div className="glass rounded-3xl p-8 text-center">
        <UserRound className="mx-auto size-12 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">سجّل الدخول لحفظ فحوصاتك ومشاهدة سجلك. الحساب اختياري.</p>
        <Link to="/auth" className="mt-5 inline-block rounded-xl bg-gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow">تسجيل الدخول / إنشاء حساب</Link>
      </div>
    </div>
  );

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title="حسابي" />
      <dl className="glass space-y-3 rounded-3xl p-6 text-sm">
        <Row k="الاسم" v={profile?.display_name ?? "—"} />
        <Row k="البريد الإلكتروني" v={user.email ?? "—"} />
        <Row k="اللغة" v={profile?.preferred_language === "ar" ? "العربية" : profile?.preferred_language ?? "—"} />
        <Row k="الدولة" v={profile?.country_code === "SA" ? "المملكة العربية السعودية" : profile?.country_code ?? "—"} />
      </dl>
      <Link to="/history" className="glass flex items-center gap-3 rounded-3xl p-5 font-semibold"><History className="size-5 text-primary" /> فحوصاتي السابقة</Link>
      <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card py-3 text-sm font-semibold text-destructive ring-1 ring-border"><LogOut className="size-4" /> تسجيل الخروج</button>
    </div>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
