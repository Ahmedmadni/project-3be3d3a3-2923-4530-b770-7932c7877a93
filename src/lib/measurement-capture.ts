import type { MeasurementContext, MeasurementQuality } from "@/types/measurements";
import { assessBloodPressureCaptureQuality } from "@/engines/blood-pressure-quality";
import { assessPulseOximeterCaptureQuality } from "@/engines/pulse-oximeter-quality";
import { assessTemperatureCaptureQuality } from "@/engines/temperature-quality";
import { assessPulseCaptureQuality } from "@/engines/pulse-quality";
import { assessGlucoseCaptureQuality } from "@/engines/glucose-quality";
import { assessRespiratoryRateCaptureQuality } from "@/engines/respiratory-rate-quality";
import {
  assessHeightCaptureQuality,
  assessWeightCaptureQuality,
} from "@/engines/body-metrics-quality";

export type CaptureQuestion =
  | { key: string; label: string; type: "boolean"; required?: boolean; showWhen?: { key: string; value: string | boolean } }
  | { key: string; label: string; type: "number"; required?: boolean; min?: number; showWhen?: { key: string; value: string | boolean } }
  | { key: string; label: string; type: "select"; required?: boolean; options: Array<{ value: string; label: string }>; showWhen?: { key: string; value: string | boolean } };

const yesNo = (key: string, label: string, required = true): CaptureQuestion => ({ key, label, type: "boolean", required });

const questions: Record<string, CaptureQuestion[]> = {
  blood_pressure: [
    yesNo("device_validated", "هل الجهاز موثوق/مخصص للقياس المنزلي؟"),
    yesNo("cuff_size_confirmed", "هل مقاس الكفة مناسب لذراعك؟"),
    { key: "rest_minutes", label: "كم دقيقة استرحت قبل القياس؟", type: "number", min: 0, required: true },
    yesNo("back_supported", "هل الظهر مسنود؟"),
    yesNo("feet_flat", "هل القدمان على الأرض؟"),
    yesNo("legs_crossed", "هل الساقان متقاطعتان؟"),
    yesNo("arm_supported_at_heart_level", "هل الذراع مسنود في مستوى القلب؟"),
    yesNo("cuff_over_clothing", "هل الكفة فوق الملابس؟"),
    yesNo("talking_during_measurement", "هل تحدثت أثناء القياس؟"),
    yesNo("recent_smoking_caffeine_or_exercise_30m", "هل دخنت/شربت كافيين/مارست مجهودًا خلال 30 دقيقة؟"),
  ],
  oxygen_saturation: [
    yesNo("device_intended_for_medical_use", "هل الجهاز مخصص للاستخدام الطبي؟"),
    yesNo("hand_warm", "هل اليد دافئة؟"),
    yesNo("nail_polish_removed", "هل أزيل طلاء الأظافر من الإصبع المستخدم؟"),
    yesNo("motion_free", "هل بقيت ثابتًا أثناء القياس؟"),
    yesNo("reading_stable", "هل انتظرت حتى استقرت القراءة؟"),
    yesNo("poor_circulation", "هل لديك ضعف ملحوظ بالدورة الدموية في اليد؟"),
    yesNo("current_tobacco_use", "هل تستخدم التبغ حاليًا؟"),
    yesNo("signal_quality_ok", "هل أظهر الجهاز إشارة/نبضًا جيدًا؟"),
  ],
  temperature: [
    { key: "measurement_site", label: "موضع القياس", type: "select", required: true, options: [
      { value: "oral", label: "الفم" }, { value: "axillary", label: "الإبط" },
      { value: "tympanic", label: "الأذن" }, { value: "temporal", label: "الجبهة/الصدغ" },
      { value: "rectal", label: "شرجي" }, { value: "other", label: "أخرى" },
    ]},
    yesNo("device_supported", "هل استخدمت ميزان حرارة رقميًا مناسبًا؟"),
    { key: "recent_food_or_drink", label: "هل تناولت طعامًا أو شرابًا مؤخرًا؟", type: "boolean", required: true, showWhen: { key: "measurement_site", value: "oral" } },
    { key: "ear_technique_confirmed", label: "هل اتبعت وضعية جهاز الأذن الصحيحة؟", type: "boolean", required: true, showWhen: { key: "measurement_site", value: "tympanic" } },
    { key: "skin_contact_confirmed", label: "هل لامس الجهاز جلد الإبط مباشرة؟", type: "boolean", required: true, showWhen: { key: "measurement_site", value: "axillary" } },
  ],
  pulse: [
    { key: "rest_state", label: "حالة القياس", type: "select", required: true, options: [
      { value: "resting", label: "راحة" }, { value: "post_exercise", label: "بعد مجهود" },
      { value: "exercise", label: "أثناء مجهود" }, { value: "sleep", label: "أثناء النوم" },
    ]},
    yesNo("calm", "هل كنت هادئًا أثناء القياس؟"),
    yesNo("recent_exercise", "هل مارست مجهودًا مؤخرًا؟"),
    { key: "measurement_method", label: "طريقة القياس", type: "select", required: true, options: [
      { value: "manual", label: "يدوي" }, { value: "device", label: "جهاز" },
    ]},
    { key: "count_duration_seconds", label: "مدة العد بالثواني", type: "number", min: 1, required: true, showWhen: { key: "measurement_method", value: "manual" } },
    { key: "device_supported", label: "هل الجهاز مناسب للقياس؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "device" } },
    yesNo("rhythm_regular", "هل بدا النبض منتظمًا؟"),
    { key: "body_position", label: "وضع الجسم", type: "select", required: true, options: [
      { value: "sitting", label: "جلوس" }, { value: "lying", label: "استلقاء" }, { value: "standing", label: "وقوف" },
    ]},
  ],
  blood_glucose: [
    { key: "measurement_method", label: "طريقة القياس", type: "select", required: true, options: [
      { value: "home_meter", label: "جهاز منزلي" }, { value: "laboratory", label: "مختبر" }, { value: "cgm", label: "حساس مستمر CGM" },
    ]},
    { key: "sample_source", label: "نوع العينة", type: "select", required: true, options: [
      { value: "capillary_whole_blood", label: "دم شعيري" }, { value: "venous_plasma", label: "بلازما وريدية" }, { value: "interstitial", label: "سائل خلالي" },
    ]},
    { key: "timing", label: "توقيت القياس", type: "select", required: true, options: [
      { value: "fasting", label: "صائم" }, { value: "random", label: "عشوائي" }, { value: "pre_meal", label: "قبل الوجبة" }, { value: "post_meal", label: "بعد الوجبة" }, { value: "ogtt_2h", label: "OGTT بعد ساعتين" },
    ]},
    { key: "meter_supported", label: "هل جهاز القياس صالح ومناسب؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "home_meter" } },
    { key: "hands_washed_and_dry", label: "هل غسلت وجففت يديك؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "home_meter" } },
    { key: "strip_compatible", label: "هل الشرائط متوافقة مع الجهاز؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "home_meter" } },
    { key: "strip_expired", label: "هل الشرائط منتهية الصلاحية؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "home_meter" } },
    { key: "strip_storage_ok", label: "هل حُفظت الشرائط بصورة صحيحة؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "home_meter" } },
    { key: "sample_sufficient", label: "هل كانت عينة الدم كافية؟", type: "boolean", required: true, showWhen: { key: "measurement_method", value: "home_meter" } },
  ],
  respiratory_rate: [
    { key: "rest_state", label: "حالة القياس", type: "select", required: true, options: [{ value: "resting", label: "راحة" }, { value: "post_exercise", label: "بعد مجهود" }] },
    yesNo("relaxed", "هل كنت مسترخيًا؟"),
    { key: "count_duration_seconds", label: "مدة العد بالثواني", type: "number", min: 1, required: true },
    yesNo("patient_aware_of_count", "هل كان الشخص مدركًا أن أنفاسه تُعد؟"),
    yesNo("rhythm_regular", "هل التنفس منتظم؟"),
    { key: "depth", label: "عمق التنفس", type: "select", required: true, options: [
      { value: "shallow", label: "سطحي" }, { value: "normal", label: "طبيعي" }, { value: "deep", label: "عميق" },
    ]},
    yesNo("respiratory_distress_present", "هل توجد علامات جهد أو ضيق تنفس؟"),
  ],
  weight: [
    yesNo("scale_level_surface", "هل الميزان على سطح صلب ومستوي؟"),
    yesNo("same_scale_for_trend", "هل تستخدم نفس الميزان للمتابعة؟"),
    yesNo("shoes_or_heavy_items_removed", "هل أزلت الأحذية والأشياء الثقيلة؟"),
    yesNo("still_until_stable", "هل بقيت ثابتًا حتى استقرت القراءة؟"),
    { key: "time_of_day", label: "وقت القياس", type: "select", required: true, options: [
      { value: "morning", label: "صباحًا" }, { value: "afternoon", label: "ظهرًا" }, { value: "evening", label: "مساءً" },
    ]},
  ],
  height: [
    yesNo("shoes_removed", "هل أزلت الحذاء؟"),
    yesNo("upright_posture", "هل وقفت باستقامة؟"),
    yesNo("head_position_neutral", "هل الرأس في وضع محايد؟"),
    { key: "height_method", label: "طريقة القياس", type: "select", required: true, options: [
      { value: "stadiometer", label: "مقياس طول" }, { value: "wall_measure", label: "قياس على الحائط" }, { value: "other", label: "أخرى" },
    ]},
  ],
};

export function getCaptureQuestions(code: string, context: MeasurementContext): CaptureQuestion[] {
  return (questions[code] ?? []).filter((q) => !q.showWhen || context[q.showWhen.key] === q.showWhen.value);
}

export function isCaptureComplete(code: string, context: MeasurementContext): boolean {
  return getCaptureQuestions(code, context)
    .filter((q) => q.required !== false)
    .every((q) => context[q.key] !== undefined && context[q.key] !== null && context[q.key] !== "");
}

export function assessMeasurementCaptureQuality(
  code: string,
  context: MeasurementContext,
): { quality: MeasurementQuality; issues: string[] } {
  if (!isCaptureComplete(code, context)) return { quality: "unknown", issues: [] };

  switch (code) {
    case "blood_pressure": return assessBloodPressureCaptureQuality(context);
    case "oxygen_saturation": return assessPulseOximeterCaptureQuality(context);
    case "temperature": return assessTemperatureCaptureQuality(context);
    case "pulse": return assessPulseCaptureQuality(context);
    case "blood_glucose": return assessGlucoseCaptureQuality(context);
    case "respiratory_rate": return assessRespiratoryRateCaptureQuality(context);
    case "weight": return assessWeightCaptureQuality(context);
    case "height": return assessHeightCaptureQuality(context);
    default: return { quality: "unknown", issues: [] };
  }
}

export const captureIssueAr: Record<string, string> = {
  DEVICE_NOT_VALIDATED: "الجهاز غير موثق كجهاز مناسب للقياس.",
  CUFF_SIZE_NOT_CONFIRMED: "مقاس الكفة غير مؤكد.",
  REST_UNDER_5_MINUTES: "مدة الراحة قبل القياس أقل من 5 دقائق.",
  BACK_NOT_SUPPORTED: "الظهر غير مسنود.",
  FEET_NOT_FLAT: "القدمان ليستا بوضع ثابت على الأرض.",
  LEGS_CROSSED: "الساقان متقاطعتان أثناء القياس.",
  ARM_NOT_SUPPORTED_AT_HEART_LEVEL: "الذراع غير مسنود في مستوى القلب.",
  CUFF_OVER_CLOTHING: "الكفة موضوعة فوق الملابس.",
  TALKING_DURING_MEASUREMENT: "حدث حديث أثناء القياس.",
  RECENT_SMOKING_CAFFEINE_OR_EXERCISE: "هناك تدخين/كافيين/مجهود حديث قبل القياس.",
  DEVICE_NOT_MEDICAL_PURPOSE: "الجهاز ليس مخصصًا للاستخدام الطبي.",
  HAND_NOT_WARM: "اليد ليست دافئة.",
  NAIL_POLISH_PRESENT: "طلاء الأظافر قد يؤثر على القراءة.",
  MOTION_DURING_READING: "حدثت حركة أثناء القراءة.",
  READING_NOT_STABLE: "لم تُنتظر القراءة حتى تستقر.",
  POOR_CIRCULATION: "ضعف الدورة الدموية قد يقلل موثوقية القراءة.",
  CURRENT_TOBACCO_USE: "استخدام التبغ قد يؤثر على التفسير.",
  SIGNAL_QUALITY_NOT_CONFIRMED: "جودة إشارة الجهاز غير مؤكدة.",
  RECENT_ORAL_FOOD_OR_DRINK: "قياس الفم تم بعد طعام أو شراب حديث.",
  EAR_TECHNIQUE_NOT_CONFIRMED: "تقنية قياس الأذن غير مؤكدة.",
  AXILLARY_SKIN_CONTACT_NOT_CONFIRMED: "ملامسة الجلد في الإبط غير مؤكدة.",
  NOT_RESTING: "القراءة ليست في حالة راحة.",
  NOT_CALM: "القياس لم يتم في حالة هدوء.",
  POST_EXERCISE: "هناك مجهود حديث.",
  MANUAL_COUNT_UNDER_60_SECONDS: "العد اليدوي أقل من 60 ثانية.",
  DEVICE_NOT_SUPPORTED: "صلاحية جهاز القياس غير مؤكدة.",
  RHYTHM_REGULARITY_NOT_RECORDED: "انتظام النبض غير موثق.",
  POSITION_NOT_RECORDED: "وضع الجسم غير موثق.",
  METER_NOT_SUPPORTED: "جهاز السكر غير مؤكد الصلاحية.",
  HANDS_NOT_WASHED_AND_DRY: "اليدان لم تُغسلا وتُجففا قبل القياس.",
  STRIP_NOT_COMPATIBLE: "الشرائط غير مؤكدة التوافق.",
  STRIP_EXPIRED_OR_STORAGE_UNCERTAIN: "صلاحية أو تخزين الشرائط غير مناسب.",
  SAMPLE_INSUFFICIENT: "عينة الدم غير كافية.",
  NOT_RELAXED: "القياس لم يتم في حالة استرخاء.",
  COUNT_UNDER_60_SECONDS: "مدة عد التنفس أقل من 60 ثانية.",
  PATIENT_AWARE_OF_COUNT: "إدراك الشخص للعد قد يغير نمط التنفس.",
  RHYTHM_NOT_RECORDED: "انتظام التنفس غير موثق.",
  DEPTH_NOT_RECORDED: "عمق التنفس غير موثق.",
  DISTRESS_NOT_RECORDED: "وجود ضيق التنفس غير موثق.",
  SCALE_NOT_LEVEL: "الميزان ليس على سطح مستوٍ.",
  SCALE_NOT_CONSISTENT: "استخدام ميزان مختلف يقلل قابلية مقارنة الاتجاه.",
  SHOES_OR_HEAVY_ITEMS: "الأحذية أو الأشياء الثقيلة لم تُزل.",
  NOT_STILL: "لم يتم الثبات حتى استقرار قراءة الوزن.",
  TIME_OF_DAY_NOT_RECORDED: "وقت قياس الوزن غير موثق.",
  SHOES_WORN: "الحذاء لم يُزل عند قياس الطول.",
  NOT_UPRIGHT: "وضع الجسم غير مستقيم.",
  HEAD_POSITION_NOT_NEUTRAL: "وضع الرأس غير مناسب.",
  HEIGHT_METHOD_NOT_RECORDED: "طريقة قياس الطول غير موثقة.",
};
