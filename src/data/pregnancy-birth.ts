/**
 * Patient education only: no symptom scoring, diagnosis, gestational cutoffs for
 * discharge, or rules that suggest delaying medical care.
 * Clinical localization and review remain required before treating as approved advice.
 */
export type BirthLocale = "ar" | "en";
type Localized = Record<BirthLocale, string>;
export type BirthSeverity = "emergency" | "immediate";
export interface BirthArticle {
  id: string;
  title: Localized;
  body: Localized;
  sources: (keyof typeof birthSources)[];
}
export interface BirthWarning extends BirthArticle {
  severity: BirthSeverity;
}

export const birthSources = {
  labour: { title: "NHS · Signs of labour", url: "https://www.nhs.uk/pregnancy/labour-and-birth/signs-that-labour-has-begun/" },
  stages: { title: "NHS · Stages of labour", url: "https://www.nhs.uk/pregnancy/labour-and-birth/the-stages-of-labour-and-birth/" },
  movements: { title: "NHS · Baby movements", url: "https://www.nhs.uk/pregnancy/keeping-well/your-babys-movements/" },
  after: { title: "NICE NG194 · Postnatal care", url: "https://www.nice.org.uk/guidance/ng194/chapter/recommendations" },
  early: { title: "NHS · Early days after birth", url: "https://www.nhs.uk/pregnancy/labour-and-birth/early-days/" },
  maternal: { title: "CDC · Urgent maternal warning signs", url: "https://www.cdc.gov/hearher/maternal-warning-signs/" },
  emergency: { title: "Saudi National Portal · Emergency contacts", url: "https://my.gov.sa/en/emergency-contact" },
};

export const labourWarnings: BirthWarning[] = [
  {
    id: "birth-imminent", severity: "emergency", sources: ["labour"],
    title: { ar: "الولادة تبدو وشيكة مع رغبة شديدة في الدفع", en: "Birth seems imminent, with a strong urge to push" },
    body: { ar: "اتصلي بالإسعاف فورًا إذا بدا أن الطفل سيولد الآن. لا تعتمدي على المؤقت أو تنتظري الوصول لمعدل تقلصات محدد.", en: "Call an ambulance now if the baby seems about to be born. Do not wait for a particular contraction pattern or use a timer to delay help." },
  },
  {
    id: "labour-collapse", severity: "emergency", sources: ["maternal"],
    title: { ar: "نزيف غزير أو إغماء أو ألم صدر أو ضيق تنفس شديد أو تشنج", en: "Heavy bleeding, fainting, chest pain, severe breathlessness or seizures" },
    body: { ar: "اطلبي الإسعاف فورًا وأخبريهم أنكِ حامل. لا تقودي بنفسكِ إذا كنتِ غير مستقرة.", en: "Call emergency services immediately and tell them you are pregnant. Do not drive yourself if unstable." },
  },
  {
    id: "waters", severity: "immediate", sources: ["labour"],
    title: { ar: "نزول ماء الجنين أو اشتباه تسربه", en: "Waters break or possible leaking fluid" },
    body: { ar: "اتصلي بقسم الولادة الآن حتى لو لم تبدأ التقلصات، واذكري وقت النزول ولون السائل إن أمكن. لا تنتظري حتى الصباح.", en: "Contact your maternity unit now even without contractions. Report when it happened and the fluid colour if known. Do not wait until morning." },
  },
  {
    id: "any-bleeding", severity: "immediate", sources: ["labour"],
    title: { ar: "نزيف مهبلي أثناء الحمل أو المخاض", en: "Vaginal bleeding in pregnancy or labour" },
    body: { ar: "اتصلي برعاية الحمل الآن عند حدوث نزيف. إذا كان غزيرًا أو مصحوبًا بإغماء فهذه طوارئ إسعاف.", en: "Contact maternity care now for bleeding. Heavy bleeding or fainting needs an ambulance." },
  },
  {
    id: "movements", severity: "immediate", sources: ["movements"],
    title: { ar: "قلة حركة الجنين أو توقفها أو تغير نمطها", en: "Reduced, stopped or changed baby movements" },
    body: { ar: "اتصلي فورًا حتى ليلًا. تستمر حركة الجنين حتى أثناء المخاض؛ ولا يُطمئن جهاز النبض المنزلي وحده.", en: "Contact maternity care immediately, even overnight. Babies continue moving during labour; a home Doppler is not reassuring." },
  },
  {
    id: "preterm", severity: "immediate", sources: ["labour"],
    title: { ar: "علامات مخاض قبل إتمام 37 أسبوعًا", en: "Signs of labour before 37 completed weeks" },
    body: { ar: "اتصلي بقسم الولادة الآن عند وجود تقلصات منتظمة أو اشتباه مخاض قبل الأسبوع 37؛ لا تنتظري تكرارها لوقت محدد.", en: "Call maternity care now for regular contractions or suspected labour before 37 weeks; do not wait for a timed pattern." },
  },
  {
    id: "frequent", severity: "immediate", sources: ["labour"],
    title: { ar: "تقلصات منتظمة أو شديدة أو غير معتادة", en: "Regular, intense or unusual contractions" },
    body: { ar: "اتصلي بقسم الولادة إذا ظننتِ أن المخاض بدأ، وخاصةً إذا تكررت التقلصات كل خمس دقائق أو أقل أو استمرت إحداها أكثر من دقيقتين. لا تتجاهلي القلق حتى إن كانت أقل تكرارًا.", en: "Call maternity care if you think labour has started, particularly with contractions five minutes apart or closer or any lasting longer than two minutes. Seek advice whenever worried, even without a typical pattern." },
  },
];

export const postpartumWarnings: BirthWarning[] = [
  {
    id: "after-bleeding", severity: "emergency", sources: ["early", "maternal"],
    title: { ar: "نزيف مفاجئ وغزير بعد الولادة أو دوخة وإغماء معه", en: "Sudden, very heavy bleeding after birth or bleeding with faintness" },
    body: { ar: "اتصلي بالإسعاف فورًا. النزيف الشديد بعد الولادة حالة طارئة؛ لا تنتظري موعد المتابعة.", en: "Call an ambulance immediately. Heavy bleeding after birth is an emergency, not something to await a routine visit." },
  },
  {
    id: "after-breathing", severity: "emergency", sources: ["maternal", "after"],
    title: { ar: "ألم صدر أو صعوبة تنفس أو تشنج أو فقدان وعي", en: "Chest pain, difficulty breathing, seizures or loss of consciousness" },
    body: { ar: "اطلبي الإسعاف فورًا، واذكري أنكِ ولدتِ مؤخرًا.", en: "Call emergency services now and say that you recently gave birth." },
  },
  {
    id: "after-mental", severity: "emergency", sources: ["maternal"],
    title: { ar: "نية أو خطر فوري لإيذاء نفسكِ أو الطفل", en: "Immediate risk of harming yourself or your baby" },
    body: { ar: "اطلبي مساعدة طارئة، وابقَي مع شخص موثوق، ولا تبقَي وحدكِ مع الخطر.", en: "Seek emergency help, stay with a trusted person, and do not remain alone with the danger." },
  },
  {
    id: "after-headache", severity: "immediate", sources: ["after", "maternal"],
    title: { ar: "صداع شديد مستمر أو تشوش الرؤية أو تورم غير معتاد", en: "Persistent severe headache, vision changes or unusual swelling" },
    body: { ar: "اطلبي تقييمًا طبيًا فورًا؛ قد تظهر مضاعفات ضغط الحمل بعد الولادة أيضًا.", en: "Seek immediate medical assessment; pregnancy-related blood pressure complications can also appear after birth." },
  },
  {
    id: "after-infection", severity: "immediate", sources: ["after", "early"],
    title: { ar: "حمى أو قشعريرة أو ألم متزايد أو إفرازات كريهة الرائحة", en: "Fever, chills, worsening pain or foul-smelling discharge" },
    body: { ar: "تواصلي مع الطبيب أو قسم الولادة دون تأخير، بما في ذلك ألم جرح القيصرية أو العجان أو علامات العدوى.", en: "Contact maternity care without delay, including for caesarean or perineal wound pain or infection signs." },
  },
  {
    id: "after-leg", severity: "immediate", sources: ["after", "maternal"],
    title: { ar: "تورم أو احمرار أو ألم في ساق واحدة", en: "Swelling, redness or pain in one leg" },
    body: { ar: "اطلبي تقييمًا طبيًا عاجلًا لاحتمال جلطة. إذا ترافق مع ضيق تنفس أو ألم صدر فاتصلي بالإسعاف.", en: "Seek urgent medical assessment for a possible clot. With chest pain or breathing difficulty, call an ambulance." },
  },
];

export const birthPreparation: BirthArticle[] = [
  { id: "birth-place", sources: ["stages"], title: { ar: "حددي المستشفى وخطة الوصول", en: "Choose your maternity unit and travel plan" }, body: { ar: "احتفظي بأرقام قسم الولادة، والطوارئ، ووسيلة نقل بديلة، واتفقوا مسبقًا على من سيرافقكِ.", en: "Keep the maternity unit and emergency contact details, a backup route and transport, and an agreed support person." } },
  { id: "birth-records", sources: ["stages"], title: { ar: "جهزي معلوماتكِ الطبية", en: "Prepare your medical information" }, body: { ar: "احتفظي بمواعيد السونار، والنتائج، والأدوية، والحساسية، وفصيلة الدم إن كانت معروفة، وخطة الولادة المتفق عليها.", en: "Keep scan dates, results, medicines, allergies, blood group if known and your discussed birth plan handy." } },
  { id: "birth-plan", sources: ["stages"], title: { ar: "ناقشي رغبات الولادة بمرونة", en: "Discuss flexible birth preferences" }, body: { ar: "اسألي فريق الرعاية عن خيارات تسكين الألم والمرافق والولادة القيصرية عند الحاجة، مع الاستعداد لتغير الخطة طبيًا.", en: "Discuss pain relief, birth companions and situations requiring a caesarean birth, while staying flexible if clinical needs change." } },
  { id: "birth-bag", sources: ["stages"], title: { ar: "جهزي حقيبة الأم والطفل", en: "Pack essentials for you and your baby" }, body: { ar: "مستندات الهوية، هاتف وشاحن، ملابس مناسبة، مستلزمات النظافة، وملابس الطفل حسب تعليمات المستشفى.", en: "Bring identity documents, phone and charger, suitable clothes, hygiene items and newborn essentials per your hospital guidance." } },
];

export const aftercare: BirthArticle[] = [
  { id: "after-followup", sources: ["after"], title: { ar: "التزمي بمتابعة النفاس", en: "Arrange postnatal follow-up" }, body: { ar: "راجعي ضغط الدم والتعافي والجروح والرضاعة والصحة النفسية مع الفريق حسب خطتكِ، ولا تؤجلي الأعراض العاجلة للموعد.", en: "Review blood pressure, recovery, wounds, feeding and emotional wellbeing with your team. Do not defer urgent symptoms to an appointment." } },
  { id: "after-bleeding-normal", sources: ["early"], title: { ar: "راقبي النزيف الطبيعي دون تجاهل الخطر", en: "Know normal bleeding without dismissing danger signs" }, body: { ar: "قد يستمر نزول دم النفاس لأسابيع ويقل تدريجيًا. النزيف المفاجئ الغزير أو المتزايد أو المصحوب بدوخة يحتاج مساعدة فورية.", en: "Postnatal bleeding may last weeks and usually reduces. Sudden heavy or increasing bleeding or bleeding with dizziness needs prompt help." } },
  { id: "after-feeding", sources: ["early", "after"], title: { ar: "اطلبي دعم الرضاعة والتغذية", en: "Get support with feeding" }, body: { ar: "ناقشي الرضاعة ومشكلات الألم أو احتقان الثدي وتغذية الطفل مع مختص؛ لا تتجاهلي احمرار الثدي المتفاقم أو الحرارة.", en: "Ask for help with feeding, pain and engorgement. Seek assessment for worsening breast redness or fever." } },
  { id: "after-wellbeing", sources: ["maternal", "after"], title: { ar: "اهتمي بصحتكِ النفسية", en: "Monitor your mental wellbeing" }, body: { ar: "تحدثي إلى الفريق عند حزن أو قلق مستمر أو أفكار مخيفة. أفكار إيذاء النفس أو الطفل تستدعي مساعدة عاجلة.", en: "Tell your care team about persistent sadness, anxiety or distressing thoughts. Thoughts of harm need urgent help." } },
];
