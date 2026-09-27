import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";
import { ContentVersionsPanel } from "@/components/admin/ContentVersionsPanel";
export const Route = createFileRoute("/admin/symptoms")({ component: Page });
function Page() {
  return <><AdminEntityManager table="symptoms" title="الأعراض" description="إدارة قاموس الأعراض بالعربية والإنجليزية وحالة المراجعة."
    primaryField="name_ar" orderBy="sort_order"
    defaultValues={{ code:"", name_ar:"", name_en:"", description_ar:"", description_en:"", category:"", body_system:"", is_red_flag_candidate:false, is_active:true, sort_order:0, is_demo:false, translation_status:"not_started" }}
    fields={[
      {key:"code",label:"الكود",required:true},{key:"name_ar",label:"الاسم بالعربية",required:true},{key:"name_en",label:"الاسم بالإنجليزية"},
      {key:"description_ar",label:"الوصف بالعربية",type:"textarea"},{key:"description_en",label:"الوصف بالإنجليزية",type:"textarea"},
      {key:"category",label:"التصنيف"},{key:"body_system",label:"الجهاز/المنظومة"},{key:"sort_order",label:"الترتيب",type:"number"},
      {key:"is_red_flag_candidate",label:"مرشح لعلامة خطر",type:"checkbox"},{key:"is_active",label:"نشط",type:"checkbox"},
      {key:"is_demo",label:"بيانات تجريبية",type:"checkbox"},
      {key:"translation_status",label:"حالة الترجمة",type:"select",options:[{value:"not_started",label:"لم تبدأ"},{value:"in_progress",label:"قيد الترجمة"},{value:"reviewed",label:"مراجعة"}]}
    ]} /><ContentVersionsPanel entityType="symptoms" /></>;
}
