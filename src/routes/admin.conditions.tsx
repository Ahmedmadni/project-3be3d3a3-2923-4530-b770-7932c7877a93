import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";
import { ContentVersionsPanel } from "@/components/admin/ContentVersionsPanel";
import { SourceLinker } from "@/components/admin/SourceLinker";
import { ConditionSymptomsEditor } from "@/components/admin/ConditionSymptomsEditor";
export const Route = createFileRoute("/admin/conditions")({
  staticData: { sitemap: false }, component: Page });
function Page() {
  return <><AdminEntityManager table="conditions" title="الحالات المحتملة" description="محتوى الحالات المستخدم في محرك المطابقة. لا تُنشر البيانات قبل المراجعة الطبية."
    primaryField="name_ar"
    defaultValues={{ code:"", name_ar:"", name_en:"", summary_ar:"", summary_en:"", category:"", specialty:"", care_level:"routine", when_to_seek_care_ar:"", is_active:true, is_demo:false, translation_status:"not_started" }}
    fields={[
      {key:"code",label:"الكود",required:true},{key:"name_ar",label:"الاسم بالعربية",required:true},{key:"name_en",label:"الاسم بالإنجليزية"},
      {key:"summary_ar",label:"النبذة بالعربية",type:"textarea"},{key:"summary_en",label:"النبذة بالإنجليزية",type:"textarea"},
      {key:"category",label:"التصنيف"},{key:"specialty",label:"التخصص"},
      {key:"care_level",label:"مستوى الرعاية",type:"select",options:[{value:"self_care",label:"رعاية ذاتية"},{value:"routine",label:"روتيني"},{value:"urgent",label:"عاجل"},{value:"emergency",label:"طوارئ"}]},
      {key:"when_to_seek_care_ar",label:"متى يُنصح بالتقييم الطبي",type:"textarea"},{key:"is_active",label:"نشط",type:"checkbox"},{key:"is_demo",label:"بيانات تجريبية",type:"checkbox"},
      {key:"translation_status",label:"حالة الترجمة",type:"select",options:[{value:"not_started",label:"لم تبدأ"},{value:"in_progress",label:"قيد الترجمة"},{value:"reviewed",label:"مراجعة"}]}
    ]} /><ConditionSymptomsEditor /><SourceLinker entityTable="conditions" entityLabelField="name_ar" linkTable="condition_sources" entityForeignKey="condition_id" title="مصادر الحالات" /><ContentVersionsPanel entityType="conditions" /></>;
}
