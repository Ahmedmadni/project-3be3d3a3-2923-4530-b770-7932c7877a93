import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, Siren, HeartHandshake } from "lucide-react";
import { referenceQuery } from "@/lib/reference-data";
import { selectEmergencyContacts } from "@/engines/emergency-contacts";
import { appConfig } from "@/config/app";
import { localized, useI18n } from "@/i18n";

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
  // Never block this screen on network: static fallback renders immediately.
  const { data } = useQuery(referenceQuery);
  const { lang, t } = useI18n();
  const contacts = selectEmergencyContacts(data?.emergencyContacts ?? [], appConfig.defaultCountry, null);
  const ambulance = contacts.find((c) => c.service_type === "ambulance")?.phone_number ?? appConfig.emergencyFallback.ambulance.number;
  const others = contacts.filter((c) => c.service_type !== "ambulance");

  const contactName = (contact: (typeof others)[number]) =>
    localized(contact as unknown as Record<string, unknown>, "name", lang) ?? contact.name_ar;

  return (
    <div className="mx-auto max-w-xl space-y-5 animate-rise">
      <div className="glass rounded-[2rem] p-6 text-center md:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-destructive-soft text-destructive">
          <Siren className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">{t("emergency.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("emergency.description")}</p>
        <div className="mt-6 space-y-3">
          <a href={`tel:${ambulance}`} className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-4 font-bold text-destructive-foreground shadow-danger">
            <Phone className="size-5" /> {t("emergency.callAmbulance", { number: ambulance })}
          </a>
          {others.map((contact) => (
            <a key={contact.id} href={`tel:${contact.phone_number}`} className="flex items-center justify-center gap-2 rounded-2xl bg-card py-4 font-semibold text-destructive ring-1 ring-border">
              <Phone className="size-5" /> {contactName(contact)} {contact.phone_number}
            </a>
          ))}
          <Link to="/first-aid" className="flex items-center justify-center gap-2 rounded-2xl bg-card py-4 font-semibold ring-1 ring-border">
            <HeartHandshake className="size-5 text-primary" /> {t("emergency.waitingGuide")}
          </Link>
        </div>
        <p className="mt-6 text-xs font-semibold text-destructive">{t("emergency.doNotRely")}</p>
      </div>
    </div>
  );
}
