import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";
export const Route = createFileRoute("/admin/sources")({ component: Page });
function Page() {
  return <AdminEntityManager table="medical_sources" title="المصادر الطبية" description="سجل المصادر المستخدمة لدعم المحتوى والقواعد."
    primaryField="title" governed={false}
    defaultValues={{ title:"", organization:"", url:"", source_type:"government", publication_date:"", last_checked_at:"", language:"ar", notes:"", country:"SA", organization_type:"", evidence_level:"", last_verified_at:"", expires_review_at:"", is_active:true }}
    fields={[
      {key:"title",label:"العنوان",required:true},{key:"organization",label:"الجهة"},{key:"url",label:"الرابط",type:"url"},
      {key:"source_type",label:"نوع المصدر",type:"select",options:[{value:"government",label:"حكومي"},{value:"clinical_guideline",label:"دليل سريري"},{value:"academic",label:"أكاديمي"},{value:"systematic_review",label:"مراجعة منهجية"},{value:"reference",label:"مرجع"}]},
      {key:"publication_date",label:"تاريخ النشر"},{key:"last_checked_at",label:"آخر فحص"},{key:"language",label:"اللغة"},{key:"country",label:"الدولة"},
      {key:"organization_type",label:"نوع الجهة"},{key:"evidence_level",label:"مستوى الدليل"},{key:"last_verified_at",label:"آخر تحقق"},{key:"expires_review_at",label:"موعد إعادة التحقق"},
      {key:"notes",label:"ملاحظات",type:"textarea"},{key:"is_active",label:"نشط",type:"checkbox"}
    ]} />;
}
