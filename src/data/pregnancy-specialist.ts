import type { PregnancySpecialistTopic } from "@/types/medical";

export const pregnancySpecialistLabels = {
  ar: {
    tab: "متابعة متخصصة", title: "حالات تحتاج خطة متابعة خاصة", topic: "الحالة أو الموضوع", followUp: "ما تناقشينه مع فريق الحمل", urgent: "متى لا تنتظرين الموعد؟", source: "المصدر",
    note: "وجود هذه الحالات لا يعني بالضرورة حدوث مضاعفات. هذه الجداول للتحضير للنقاش مع الطبيب، وليست تشخيصًا أو خطة علاج؛ قد تحتاجين متابعة مختلفة عن جدول الحمل المعتاد.",
    review: "معلومات مستندة إلى المصادر المرتبطة؛ المراجعة الطبية المحلية داخل التطبيق لم تكتمل بعد.",
  },
  en: {
    tab: "Specialist care", title: "Conditions needing an individual care plan", topic: "Condition or topic", followUp: "Discuss with your maternity team", urgent: "When not to wait for a visit", source: "Source",
    note: "These conditions do not necessarily mean complications will occur. These tables support a clinical conversation, not diagnosis or treatment; your follow-up may differ from a routine pregnancy schedule.",
    review: "Information based on the linked sources; local clinical review within this app remains pending.",
  },
};

export const pregnancySpecialistSources: Record<string, { title: string; url: string }> = {
  diabetes: { title: "NHS · Gestational diabetes", url: "https://www.nhs.uk/conditions/gestational-diabetes/" },
  hypertension: { title: "NHS · Pre-eclampsia", url: "https://www.nhs.uk/conditions/pre-eclampsia/" },
  rh: { title: "NHS · Rhesus disease prevention", url: "https://www.nhs.uk/conditions/rhesus-disease/prevention/" },
  iron: { title: "NHS · Iron deficiency anaemia", url: "https://www.nhs.uk/conditions/iron-deficiency-anaemia/" },
  twins: { title: "NHS · Antenatal care with twins", url: "https://www.nhs.uk/pregnancy/having-twins/antenatal-care/" },
  medicines: { title: "NHS · Medicines in pregnancy", url: "https://www.nhs.uk/pregnancy/keeping-well/medicines/" },
  warning: { title: "CDC · Maternal warning signs", url: "https://www.cdc.gov/hearher/maternal-warning-signs/" },
};

export const pregnancySpecialistTopics: PregnancySpecialistTopic[] = [
  { id: "diabetes", sources: ["diabetes", "warning"], title: { ar: "سكري الحمل أو السكري قبل الحمل", en: "Gestational or pre-existing diabetes" },
    followUp: { ar: "قد لا يسبب سكري الحمل أعراضًا، لذلك لا يغني الشعور الجيد عن الفحص. يُجرى الفحص عادةً بين 24 و28 أسبوعًا وفق عوامل الخطر والبرنامج المحلي، وقد يُطلب مبكرًا. عند تشخيصه ناقشي التغذية وقياس السكر والعلاج ومتابعة نمو الجنين؛ لا تغيّري العلاج بنفسكِ.", en: "Gestational diabetes may cause no symptoms, so feeling well does not replace screening. Testing commonly occurs at 24–28 weeks based on risks and local programmes, sometimes earlier. If diagnosed, discuss nutrition, glucose monitoring, treatment and fetal growth; do not change treatment yourself." },
    urgent: { ar: "اطلبي تقييمًا الآن عند قيء شديد أو عدم القدرة على شرب السوائل أو تدهور عام. اتّبعي خطة فريق السكري للتعامل مع القراءات غير المعتادة دون انتظار الزيارة.", en: "Seek assessment now for severe vomiting, inability to drink or feeling very unwell. Follow your diabetes team's plan for unusual readings rather than waiting for a visit." } },
  { id: "hypertension", sources: ["hypertension", "warning"], title: { ar: "ارتفاع الضغط ومقدمات تسمم الحمل", en: "Hypertension and pre-eclampsia" },
    followUp: { ar: "قد يظهر ارتفاع الضغط دون أعراض. مقدمات تسمم الحمل تظهر عادةً بعد 20 أسبوعًا وقد تظهر بعد الولادة أيضًا. ناقشي متابعة الضغط والبول وأي علاج موصوف؛ الطبيب وحده يقرر الحاجة إلى الأسبرين منخفض الجرعة.", en: "High blood pressure may be symptom-free. Pre-eclampsia usually develops after 20 weeks and may also occur after birth. Discuss blood pressure, urine checks and prescribed treatment; only your clinician decides whether low-dose aspirin is indicated." },
    urgent: { ar: "اتصلي بالرعاية فورًا عند صداع شديد مستمر، تشوش الرؤية، ألم أسفل الضلوع أو تورم مفاجئ بالوجه واليدين. التشنجات أو الانهيار أو ضيق التنفس الشديد حالة طوارئ؛ لا يلزم اجتماع العلامات.", en: "Call care immediately for persistent severe headache, vision changes, pain below the ribs or sudden face and hand swelling. Seizures, collapse or severe breathing difficulty are emergencies; signs need not occur together." } },
  { id: "rh-negative", sources: ["rh"], title: { ar: "فصيلة الدم وعامل Rh السالب", en: "Blood group and Rh-negative status" },
    followUp: { ar: "السالب ليس مرضًا بحد ذاته. يُراجع عامل Rh والأجسام المضادة في فحوص الحمل. قد تحتاجين حقنة anti-D إذا كنتِ Rh سالبة وغير متحسسة؛ التوقيت وعدد الجرعات يعتمدان على البرنامج المحلي ونتائج الفحوص، وقد تحتاجينها بعد أحداث معينة أو الولادة.", en: "Rh-negative status is not itself a disease. Blood group and antibody screening guide care. Anti-D may be needed if you are Rh-negative and not sensitised; timing and doses depend on the local programme and results, with additional indications after certain events or birth." },
    urgent: { ar: "أبلغي فريق الحمل فورًا عن نزيف أو إصابة بالبطن أو إجراء طبي، واذكري عامل Rh إن كان معروفًا؛ لا تنتظري الحقنة الروتينية القادمة. النزيف الغزير أو الإغماء يحتاج الطوارئ.", en: "Tell maternity care promptly about bleeding, abdominal injury or a procedure, and mention your Rh status if known; do not wait for routine anti-D. Heavy bleeding or fainting needs emergency help." } },
  { id: "anaemia", sources: ["iron", "warning"], title: { ar: "فقر الدم ونقص الحديد", en: "Anaemia and iron deficiency" },
    followUp: { ar: "التعب وحده لا يثبت نقص الحديد. ناقشي نتائج صورة الدم وفحوص الحديد عند الحاجة وخطة الغذاء والمكملات وإعادة الفحص. ليست كل أنواع فقر الدم بسبب الحديد، ولا تضاعفي المكملات من نفسكِ.", en: "Fatigue alone does not establish iron deficiency. Discuss blood count and iron tests when indicated, food, supplements and repeat testing. Not all anaemia is due to iron; do not double supplements yourself." },
    urgent: { ar: "ضيق التنفس الشديد أو ألم الصدر أو الانهيار يحتاج الطوارئ؛ لا تنسبي هذه الأعراض إلى فقر الدم دون تقييم. تواصلي الآن عند تعب شديد غير معتاد أو دوخة مستمرة.", en: "Severe breathing difficulty, chest pain or collapse needs emergency help; do not attribute these to anaemia without assessment. Contact care now for unusual overwhelming fatigue or persistent dizziness." } },
  { id: "multiple-pregnancy", sources: ["twins", "warning"], title: { ar: "الحمل بتوأم أو أكثر", en: "Twins or higher-order pregnancy" },
    followUp: { ar: "عدد الأجنة ومشاركة المشيمة والأكياس يؤثران على المتابعة؛ يحتاج الحمل المتعدد عادةً زيارات وسونار أكثر. ناقشي فريق المتابعة ومراقبة النمو وخطة الولادة؛ لا يكفي جدول الحمل المفرد لتحديد مواعيدكِ.", en: "Number of babies and whether placentas and sacs are shared affect follow-up. Multiple pregnancy usually needs more visits and scans. Discuss your team, growth surveillance and birth plan; a singleton timetable cannot determine your appointments." },
    urgent: { ar: "اتصلي الآن عند تقلصات منتظمة قبل موعد الولادة، تسرب سائل، نزيف أو تغير حركة الأجنة. لا تنتظري الزيارة التالية حتى لو كانت قريبة.", en: "Call now for regular contractions before term, fluid leakage, bleeding or movement changes. Do not wait for the next visit even if it is soon." } },
  { id: "chronic-treatment", sources: ["medicines", "warning"], title: { ar: "مرض مزمن أو علاج مستمر", en: "Chronic conditions or ongoing treatment" },
    followUp: { ar: "عند الربو أو الصرع أو أمراض الغدة أو القلب أو أي علاج مستمر، رتّبي مراجعة مبكرة مع طبيبكِ وفريق الحمل. أحضري أسماء المواد الفعالة والجرعات والمكملات؛ قد تحتاج الخطة تعديلًا آمنًا، وليس توقفًا مفاجئًا.", en: "For asthma, epilepsy, thyroid or heart disease, or ongoing treatment, arrange early review with your clinician and maternity team. Bring active ingredients, doses and supplements; safe adjustment may be needed, not abrupt withdrawal." },
    urgent: { ar: "لا توقفي العلاج اعتمادًا على جدول عام. عند تشنجات أو ضيق تنفس شديد أو ألم صدر أو انهيار اطلبي الطوارئ، وأخبري المستجيبين بالحمل والأدوية.", en: "Do not stop treatment based on a general table. For seizures, severe breathing difficulty, chest pain or collapse seek emergency help and tell responders about pregnancy and medicines." } },
];