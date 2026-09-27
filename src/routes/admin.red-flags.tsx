import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";
import { ContentVersionsPanel } from "@/components/admin/ContentVersionsPanel";
import { SourceLinker } from "@/components/admin/SourceLinker";
import { RedFlagRuleBuilder } from "@/components/admin/RedFlagRuleBuilder";
export const Route = createFileRoute("/admin/red-flags")({ component: Page });
function Page() {
  return <><AdminEntityManager table="red_flags" title="علامات الخطر" description="قواعد السلامة لها أولوية على النتائج؛ التعديل والنشر يخضعان للمراجعة."
    primaryField="title_ar" orderBy="priority"
    defaultValues={{ code:"", title_ar:"", title_en:"", description_ar:"", description_en:"", care_level:"emergency", priority:0, is_active:true, is_demo:false, translation_status:"not_started" }}
    fields={[
      {key:"code",label:"الكود",required:true},{key:"title_ar",label:"العنوان بالعربية",required:true},{key:"title_en",label:"العنوان بالإنجليزية"},
      {key:"description_ar",label:"الوصف بالعربية",type:"textarea"},{key:"description_en",label:"الوصف بالإنجليزية",type:"textarea"},
      {key:"care_level",label:"مستوى الرعاية",type:"select",options:[{value:"urgent",label:"عاجل"},{value:"emergency",label:"طوارئ"}]},
      {key:"priority",label:"الأولوية",type:"number"},{key:"is_active",label:"نشط",type:"checkbox"},{key:"is_demo",label:"بيانات تجريبية",type:"checkbox"},
      {key:"translation_status",label:"حالة الترجمة",type:"select",options:[{value:"not_started",label:"لم تبدأ"},{value:"in_progress",label:"قيد الترجمة"},{value:"reviewed",label:"مراجعة"}]}
    ]} /><RedFlagRuleBuilder /><SourceLinker entityTable="red_flags" entityLabelField="title_ar" linkTable="red_flag_sources" entityForeignKey="red_flag_id" title="مصادر علامات الخطر" /><ContentVersionsPanel entityType="red_flags" /></>;
}
