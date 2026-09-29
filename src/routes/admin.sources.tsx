import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";

export const Route = createFileRoute("/admin/sources")({ component: Page });

function Page() {
  return (
    <AdminEntityManager
      table="medical_sources"
      title="المصادر الطبية"
      description="سجل المصادر المستخدمة لدعم المحتوى والقواعد. المصدر لا يدعم النشر السريري إلا بعد اعتماد موثوقيته صراحة."
      primaryField="title"
      governed={false}
      defaultValues={{
        title: "",
        organization: "",
        url: "",
        source_type: "government",
        publication_date: "",
        last_checked_at: "",
        language: "ar",
        notes: "",
        country: "SA",
        organization_type: "",
        evidence_level: "",
        last_verified_at: "",
        expires_review_at: "",
        provenance_kind: "web",
        trust_level: "unreviewed",
        clinical_use_allowed: false,
        owner_verified: false,
        license_name: "",
        license_url: "",
        terms_url: "",
        verification_notes: "",
        is_active: true,
      }}
      fields={[
        { key: "title", label: "العنوان", required: true },
        { key: "organization", label: "الجهة" },
        { key: "url", label: "الرابط", type: "url" },
        {
          key: "source_type",
          label: "نوع المصدر",
          type: "select",
          options: [
            { value: "government", label: "حكومي" },
            { value: "clinical_guideline", label: "دليل سريري" },
            { value: "academic", label: "أكاديمي" },
            { value: "systematic_review", label: "مراجعة منهجية" },
            { value: "reference", label: "مرجع" },
          ],
        },
        {
          key: "trust_level",
          label: "مستوى الثقة",
          type: "select",
          options: [
            { value: "unreviewed", label: "غير مراجع" },
            { value: "authoritative", label: "جهة رسمية/مرجعية" },
            { value: "trusted_nonprofit", label: "منظمة صحية موثوقة" },
            { value: "validated_commercial", label: "خدمة تجارية موثقة" },
            { value: "community", label: "مجتمعي/مفتوح المصدر" },
          ],
        },
        { key: "clinical_use_allowed", label: "مسموح لدعم نشر محتوى سريري", type: "checkbox" },
        { key: "owner_verified", label: "تم التحقق من مالك المصدر", type: "checkbox" },
        { key: "provenance_kind", label: "نوع المنشأ" },
        { key: "publication_date", label: "تاريخ النشر" },
        { key: "last_checked_at", label: "آخر فحص" },
        { key: "language", label: "اللغة" },
        { key: "country", label: "الدولة" },
        { key: "organization_type", label: "نوع الجهة" },
        { key: "evidence_level", label: "مستوى الدليل" },
        { key: "license_name", label: "الترخيص" },
        { key: "license_url", label: "رابط الترخيص", type: "url" },
        { key: "terms_url", label: "شروط الاستخدام", type: "url" },
        { key: "last_verified_at", label: "آخر تحقق" },
        { key: "expires_review_at", label: "موعد إعادة التحقق" },
        { key: "verification_notes", label: "ملاحظات التحقق", type: "textarea" },
        { key: "notes", label: "ملاحظات", type: "textarea" },
        { key: "is_active", label: "نشط", type: "checkbox" },
      ]}
    />
  );
}
