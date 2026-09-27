import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";
import { ContentVersionsPanel } from "@/components/admin/ContentVersionsPanel";
import { SourceLinker } from "@/components/admin/SourceLinker";
import { FirstAidSectionsEditor } from "@/components/admin/FirstAidSectionsEditor";
export const Route = createFileRoute("/admin/first-aid")({ component: Page });
function Page() {
  return <><AdminEntityManager table="first_aid_topics" title="الإسعافات الأولية" description="إدارة موضوعات الإسعافات. محتوى الخطوات يظل مسودة حتى المراجعة الطبية."
    primaryField="title_ar" orderBy="priority"
    defaultValues={{ code:"", title_ar:"", title_en:"", summary_ar:"", summary_en:"", category:"", icon:"Cross", priority:0, is_active:true, is_critical:false, translation_status:"not_started" }}
    fields={[
      {key:"code",label:"الكود",required:true},{key:"title_ar",label:"العنوان بالعربية",required:true},{key:"title_en",label:"العنوان بالإنجليزية"},
      {key:"summary_ar",label:"الملخص بالعربية",type:"textarea"},{key:"summary_en",label:"الملخص بالإنجليزية",type:"textarea"},
      {key:"category",label:"التصنيف"},{key:"icon",label:"اسم الأيقونة"},{key:"priority",label:"الأولوية",type:"number"},
      {key:"is_active",label:"نشط",type:"checkbox"},{key:"is_critical",label:"حالة حرجة",type:"checkbox"},
      {key:"translation_status",label:"حالة الترجمة",type:"select",options:[{value:"not_started",label:"لم تبدأ"},{value:"in_progress",label:"قيد الترجمة"},{value:"reviewed",label:"مراجعة"}]}
    ]} /><FirstAidSectionsEditor /><SourceLinker entityTable="first_aid_topics" entityLabelField="title_ar" linkTable="first_aid_sources" entityForeignKey="first_aid_topic_id" title="مصادر الإسعافات الأولية" /><ContentVersionsPanel entityType="first_aid_topics" /></>;
}
