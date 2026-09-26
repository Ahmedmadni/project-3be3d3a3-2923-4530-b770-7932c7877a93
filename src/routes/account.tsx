import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { PageHeader } from "@/components/health/cards";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "حسابي — مؤشر صحي" },
      { name: "description", content: "إدارة حسابك وسجل الفحوصات." },
      { property: "og:title", content: "حسابي — مؤشر صحي" },
      { property: "og:description", content: "حسابك الشخصي في مؤشر صحي." },
    ],
  }),
  component: () => (
    <div className="mx-auto max-w-xl">
      <PageHeader title="حسابي" />
      <div className="glass rounded-3xl p-8 text-center">
        <UserRound className="mx-auto size-12 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">تسجيل الدخول وحفظ سجل الفحوصات سيتوفر قريبًا.</p>
      </div>
    </div>
  ),
});
