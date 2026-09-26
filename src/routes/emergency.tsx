import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Siren, HeartHandshake } from "lucide-react";
import { appConfig } from "@/config/app";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "حالة طارئة — مؤشر صحي" },
      { name: "description", content: "أرقام الطوارئ وإرشادات أثناء انتظار الإسعاف." },
      { property: "og:title", content: "حالة طارئة — مؤشر صحي" },
      { property: "og:description", content: "اتصل بالإسعاف فورًا في الحالات الطارئة." },
    ],
  }),
  component: Emergency,
});

function Emergency() {
  const { ambulance, general } = { ambulance: appConfig.emergencyFallback.ambulance, general: { label: "الطوارئ", number: "911" } };
  return (
    <div className="mx-auto max-w-xl space-y-5 animate-rise">
      <div className="glass rounded-[2rem] p-6 text-center md:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-destructive-soft text-destructive"><Siren className="size-8" /></span>
        <h1 className="mt-5 text-2xl font-extrabold">قد تحتاج إلى مساعدة طبية عاجلة</h1>
        <p className="mt-3 text-sm text-muted-foreground">بعض المعلومات التي أدخلتها قد تكون مرتبطة بحالة تحتاج إلى تقييم طبي عاجل.</p>
        <div className="mt-6 space-y-3">
          <a href={`tel:${ambulance.number}`} className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-4 font-bold text-destructive-foreground shadow-danger"><Phone className="size-5" /> الاتصال بالإسعاف {ambulance.number}</a>
          <a href={`tel:${general.number}`} className="flex items-center justify-center gap-2 rounded-2xl bg-card py-4 font-semibold text-destructive ring-1 ring-border"><Phone className="size-5" /> الاتصال بالطوارئ</a>
          <Link to="/first-aid" className="flex items-center justify-center gap-2 rounded-2xl bg-card py-4 font-semibold ring-1 ring-border"><HeartHandshake className="size-5 text-primary" /> إرشادات أثناء انتظار الإسعاف</Link>
        </div>
        <p className="mt-6 text-xs font-semibold text-destructive">لا تعتمد على التطبيق في الحالات الطارئة.</p>
      </div>
    </div>
  );
}
