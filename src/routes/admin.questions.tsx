import { createFileRoute } from "@tanstack/react-router";
import { AdminEntityManager } from "@/components/admin/AdminEntityManager";
import { ContentVersionsPanel } from "@/components/admin/ContentVersionsPanel";
import { QuestionBuilder } from "@/components/admin/QuestionBuilder";
export const Route = createFileRoute("/admin/questions")({ component: Page });
function Page() {
  return <><AdminEntityManager table="questions" title="الأسئلة الديناميكية" description="إدارة أسئلة المتابعة. القواعد الشرطية ستظهر في محرر القواعد."
    primaryField="question_ar" orderBy="sort_order"
    defaultValues={{ code:"", question_ar:"", question_en:"", question_type:"yes_no", category:"", is_active:true, sort_order:0, is_demo:false, translation_status:"not_started" }}
    fields={[
      {key:"code",label:"الكود",required:true},{key:"question_ar",label:"السؤال بالعربية",required:true},{key:"question_en",label:"السؤال بالإنجليزية"},
      {key:"question_type",label:"نوع السؤال",type:"select",options:[
        {value:"yes_no",label:"نعم / لا"},{value:"yes_no_unsure",label:"نعم / لا / غير متأكد"},{value:"single_choice",label:"اختيار واحد"},
        {value:"multi_choice",label:"اختيارات متعددة"},{value:"number",label:"رقم"},{value:"text",label:"نص"},{value:"severity",label:"شدة"},{value:"duration",label:"مدة"}]},
      {key:"category",label:"التصنيف"},{key:"sort_order",label:"الترتيب",type:"number"},{key:"is_active",label:"نشط",type:"checkbox"},{key:"is_demo",label:"بيانات تجريبية",type:"checkbox"},
      {key:"translation_status",label:"حالة الترجمة",type:"select",options:[{value:"not_started",label:"لم تبدأ"},{value:"in_progress",label:"قيد الترجمة"},{value:"reviewed",label:"مراجعة"}]}
    ]} /><QuestionBuilder /><ContentVersionsPanel entityType="questions" /></>;
}
