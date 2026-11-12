/**
 * Newborn education: first 28 days only.
 * Content is sourced and awaits local clinical review; never use as an automated triage protocol.
 * A baby may be critically ill without fever or any listed sign.
 */
export type NewbornLocale = "ar" | "en";
type Localized = Record<NewbornLocale, string>;

export const newbornSources = {
  nice: { title: "NICE NG194 · Baby illness red flags", url: "https://www.nice.org.uk/guidance/ng194/chapter/recommendations" },
  sa: { title: "Saudi MOH · Midwifery clinic standards", url: "https://www.moh.gov.sa/en/ministry/mediacenter/publications/pages/the-saudi-midwifery-clinic-standards.pdf" },
  nhs: { title: "NHS · Urgent help for babies", url: "https://www.nhs.uk/baby/health/when-to-get-urgent-medical-help-for-babies-and-children-under-5/" },
  jaundice: { title: "NHS · Jaundice in babies", url: "https://www.nhs.uk/conditions/jaundice-in-babies/" },
  niceJaundice: { title: "NICE CG98 · Newborn jaundice", url: "https://www.nice.org.uk/guidance/cg98/chapter/Recommendations" },
  sleep: { title: "NHS · Safer sleep", url: "https://www.nhs.uk/baby/caring-for-a-newborn/sudden-infant-death-syndrome-sids/" },
  who: { title: "WHO · Essential newborn care", url: "https://www.who.int/news-room/fact-sheets/detail/newborn-mortality" },
  saContacts: { title: "Saudi National Portal · Emergency contact numbers", url: "https://my.gov.sa/en/emergency-contact" },
} as const;

export interface NewbornArticle {
  id: string;
  title: Localized;
  body: Localized;
  sources: (keyof typeof newbornSources)[];
}
export interface NewbornWarning extends NewbornArticle {
  urgency: "ambulance" | "urgentAssessment";
}

/**
 * Category 'ambulance' describes immediately life-threatening signs.
 * 'urgentAssessment' also means immediate professional assessment (often ED),
 * never a wait-and-see or next-day category.
 */
export const newbornWarnings: NewbornWarning[] = [
  {
    id: "newborn-unresponsive", urgency: "ambulance", sources: ["nice", "nhs"],
    title: { ar: "الطفل لا يستجيب أو يصعب إيقاظه أو أصبح مرتخيا بشكل غير معتاد", en: "Unresponsive, difficult to wake, or unusually floppy" },
    body: { ar: "اتصلي بالإسعاف فورا. إذا كان لا يتنفس بصورة طبيعية، اتبعي تعليمات موظف الطوارئ حالا. لا تنتظري قياس الحرارة.", en: "Call an ambulance now. If the baby is not breathing normally, follow the emergency dispatcher's instructions immediately. Do not wait to check the temperature." },
  },
  {
    id: "newborn-breathing", urgency: "ambulance", sources: ["nice", "nhs", "sa"],
    title: { ar: "صعوبة شديدة في التنفس أو ازرقاق الشفتين أو اللسان", en: "Severe trouble breathing or blue lips or tongue" },
    body: { ar: "اطلبي الإسعاف فورا عند ازرقاق أو صعوبة تنفس شديدة أو توقف التنفس. علامات مثل الأنين والتنفس المجهد أو سحب الصدر تحتاج تقييما طارئا أيضا.", en: "Call an ambulance immediately for blue colour, severe breathing difficulty or pauses in breathing. Grunting, laboured breathing or chest indrawing also demand emergency assessment." },
  },
  {
    id: "newborn-seizure", urgency: "ambulance", sources: ["nice", "sa", "nhs"],
    title: { ar: "تشنجات أو نوبات غير طبيعية", en: "Seizures or abnormal fits" },
    body: { ar: "اتصلي بالإسعاف فورا. لا تضعي شيئا في فم الطفل ولا تحاولي كبح الحركات بالقوة.", en: "Call an ambulance now. Do not put anything in the baby's mouth or forcibly restrain their movements." },
  },
  {
    id: "newborn-temperature", urgency: "urgentAssessment", sources: ["nice", "nhs"],
    title: { ar: "حرارة 38°م أو أكثر، أو أقل من 36°م", en: "Temperature of 38°C or above, or below 36°C" },
    body: { ar: "يحتاج حديث الولادة لتقييم طبي طارئ الآن عند هذه القراءات. العدوى الخطيرة قد توجد أيضا دون حمى؛ لا تعتمدي على قراءة طبيعية لنفي المرض.", en: "A newborn needs immediate emergency medical assessment at these readings. Serious infection may occur without fever, so a normal temperature does not rule it out." },
  },
  {
    id: "newborn-not-feeding", urgency: "urgentAssessment", sources: ["nice", "sa", "who"],
    title: { ar: "رفض الرضاعة أو توقف مفاجئ عن الرضاعة المعتادة", en: "Refusing feeds or suddenly feeding much less" },
    body: { ar: "اطلبي تقييما طبيا عاجلا الآن، خاصة مع خمول أو قلة الاستجابة. لا تنتظري ظهور حرارة.", en: "Seek urgent medical assessment now, especially with reduced alertness. Do not wait for a fever." },
  },
  {
    id: "newborn-green-vomit", urgency: "urgentAssessment", sources: ["nice", "nhs"],
    title: { ar: "قيء أخضر أو أصفر مائل للأخضر، أو قيء اندفاعي متكرر", en: "Green or yellow-green vomit, or repeated projectile vomiting" },
    body: { ar: "اذهبي للطوارئ للتقييم الفوري؛ اللون الأخضر في القيء ليس ارتجاعا عاديا ينبغي الانتظار معه.", en: "Get an immediate emergency assessment. Green vomit is not ordinary spit-up that should be observed at home." },
  },
  {
    id: "newborn-jaundice-24", urgency: "urgentAssessment", sources: ["niceJaundice", "jaundice", "sa"],
    title: { ar: "اصفرار الجلد أو العين خلال أول 24 ساعة من الولادة", en: "Yellow skin or eyes within the first 24 hours" },
    body: { ar: "يحتاج إلى تقييم طبي عاجل في المستشفى وقياس البيليروبين؛ لا تنتظري اليوم التالي. وإذا صاحب الاصفرار خمول أو توقف الرضاعة أو صعوبة تنفس فهذه طوارئ أشد.", en: "Needs urgent hospital assessment and bilirubin testing; do not wait until the next day. Jaundice with lethargy, refusal to feed or breathing difficulty is especially urgent." },
  },
  {
    id: "newborn-rash", urgency: "urgentAssessment", sources: ["nice", "nhs"],
    title: { ar: "طفح لا يختفي عند الضغط أو يافوخ منتفخ", en: "A non-blanching rash or bulging fontanelle" },
    body: { ar: "اطلبي تقييما طبيا طارئا الآن، حتى لو لم ترتفع الحرارة.", en: "Seek an immediate emergency assessment even without fever." },
  },
  {
    id: "newborn-urine", urgency: "urgentAssessment", sources: ["nice", "nhs"],
    title: { ar: "عدم التبول أو التبرز الأول في اليوم الأول، أو علامات الجفاف", en: "No first urine or meconium in the first day, or signs of dehydration" },
    body: { ar: "تواصلي على الفور مع فريق المواليد لتقييم الحالة؛ الجفاف مع الخمول أو التدهور يحتاج الطوارئ.", en: "Contact your newborn care team immediately for assessment. Dehydration with lethargy or deterioration needs emergency care." },
  },
];

export const newbornBasics: NewbornArticle[] = [
  {
    id: "newborn-safe-sleep", sources: ["sleep"],
    title: { ar: "النوم الآمن", en: "Safer sleep" },
    body: { ar: "ضعي الطفل على ظهره لكل نومة، على سطح صلب ومستو وخال من الوسائد والألعاب والبطانيات الفضفاضة، في سرير منفصل داخل غرفتك أول ستة أشهر. تجنبي النوم معه على الأريكة أو الكرسي.", en: "Place the baby on their back for every sleep, on a firm flat clear surface without pillows, toys or loose bedding, in a separate cot in your room for the first six months. Never fall asleep with the baby on a sofa or armchair." },
  },
  {
    id: "newborn-feeding", sources: ["who", "nice"],
    title: { ar: "الرضاعة وطلب المساعدة مبكرا", en: "Feeding and early support" },
    body: { ar: "ناقشي الرضاعة ونمو الطفل مع القابلة أو طبيب الأطفال واطلبي المساعدة عند الصعوبات. الرفض المفاجئ للرضاعة أو الخمول ليس أمرا ينتظر للزيارة الدورية.", en: "Discuss feeding and growth with the midwife or paediatrician and ask for support when needed. Sudden refusal to feed or unusual lethargy must not wait for routine follow-up." },
  },
  {
    id: "newborn-jaundice-monitor", sources: ["jaundice", "niceJaundice"],
    title: { ar: "متابعة الاصفرار", en: "Monitoring jaundice" },
    body: { ar: "قد يظهر الاصفرار بعد الولادة. إذا ظهر خلال أول 24 ساعة فتوجهي للتقييم العاجل. بعد ذلك، أخبري فريق الرعاية إذا ظهر أو ازداد، ولا تعالجيه بالتعرض للشمس.", en: "Jaundice can develop after birth. If it occurs in the first 24 hours, seek immediate hospital assessment. Later, report any new or worsening jaundice to your team; do not use sun exposure as treatment." },
  },
  {
    id: "newborn-followup", sources: ["nice", "who"],
    title: { ar: "الفحوص والتطعيمات", en: "Examinations and immunisation" },
    body: { ar: "رتبي الفحص السريري للمولود والفحوص الوقائية ومواعيد التطعيم حسب برنامج بلدك وتعليمات المستشفى. قد تحتاج المواليد الخدج أو ناقصو الوزن متابعة خاصة.", en: "Arrange newborn examinations, screening and immunisations according to your country and hospital's plan. Premature or low-birthweight babies may need extra follow-up." },
  },
];

export const newbornLabels = {
  ar: {
    title: "رعاية المولود",
    subtitle: "دليل الأسابيع الأربعة الأولى: علامات الخطر، والرضاعة، والنوم، ومواعيد المتابعة.",
    emergencyHeading: "حالات تستدعي الإسعاف الآن",
    assessmentHeading: "علامات تستدعي تقييما طبيا طارئا الآن",
    emergencyNotice: "قد يتدهور حديث الولادة بسرعة. هذه القائمة ليست شاملة؛ إذا بدا الطفل مريضا أو لديك قلق شديد، اطلبي المساعدة الطبية دون الانتظار.",
    actions: "إرشادات الرعاية اليومية",
    call: "اتصال بالإسعاف في السعودية",
    emergencyPage: "صفحة الطوارئ",
    local: "الرقم 997 خاص بالمملكة العربية السعودية. استخدمي الرقم المحلي إذا كنت خارجها.",
    review: "محتوى تثقيفي مستند إلى مراجع، لم يُعتمد بعد بمراجعة طبية محلية ولا يحل محل التقييم السريري.",
  },
  en: {
    title: "Newborn care",
    subtitle: "The first four weeks: danger signs, feeding, safer sleep and follow-up.",
    emergencyHeading: "Call an ambulance now",
    assessmentHeading: "Seek immediate emergency medical assessment",
    emergencyNotice: "Newborns can deteriorate quickly. This list is not exhaustive. If your baby seems unwell or you are seriously concerned, seek medical help without delay.",
    actions: "Everyday newborn care",
    call: "Call ambulance in Saudi Arabia",
    emergencyPage: "Emergency page",
    local: "997 is Saudi Arabia's ambulance number. Elsewhere use your local emergency number.",
    review: "Sourced educational content, not yet locally clinically approved and not a replacement for a medical assessment.",
  },
} as const;
