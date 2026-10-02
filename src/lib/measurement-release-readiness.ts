export type MeasurementReleaseKind =
  | "type"
  | "reference"
  | "red_flag"
  | "knowledge";

export type MeasurementReadinessReason =
  | "demo_content"
  | "not_published"
  | "missing_active_type_source"
  | "missing_source"
  | "inactive_source"
  | "parent_not_released"
  | "missing_knowledge_sections"
  | "missing_knowledge_source";

export type MeasurementReleaseReadiness = {
  publishBlockers: MeasurementReadinessReason[];
  activationBlockers: MeasurementReadinessReason[];
};

export function measurementReleaseReadiness(params: {
  kind: MeasurementReleaseKind;
  reviewStatus: string;
  isDemo: boolean;
  sourceCount?: number;
  activeSourceCount?: number;
  sourceActive?: boolean;
  parentReviewStatus?: string | null;
  parentActive?: boolean;
  sectionCount?: number;
}): MeasurementReleaseReadiness {
  const publishBlockers: MeasurementReadinessReason[] = [];
  const activationBlockers: MeasurementReadinessReason[] = [];

  if (params.isDemo) {
    publishBlockers.push("demo_content");
    activationBlockers.push("demo_content");
  }

  if (params.kind === "type") {
    if ((params.activeSourceCount ?? 0) === 0) {
      publishBlockers.push("missing_active_type_source");
      activationBlockers.push("missing_active_type_source");
    }
  }

  if (params.kind === "reference" || params.kind === "red_flag") {
    if ((params.sourceCount ?? 0) === 0) {
      publishBlockers.push("missing_source");
      activationBlockers.push("missing_source");
    } else if (params.sourceActive === false) {
      activationBlockers.push("inactive_source");
    }

    if (
      params.parentReviewStatus !== "published" ||
      params.parentActive !== true
    ) {
      activationBlockers.push("parent_not_released");
    }
  }

  if (params.kind === "knowledge") {
    if ((params.sourceCount ?? 0) === 0) {
      publishBlockers.push("missing_knowledge_source");
      activationBlockers.push("missing_knowledge_source");
    } else if ((params.activeSourceCount ?? 0) === 0) {
      activationBlockers.push("inactive_source");
    }

    if ((params.sectionCount ?? 0) === 0) {
      publishBlockers.push("missing_knowledge_sections");
      activationBlockers.push("missing_knowledge_sections");
    }

    if (
      params.parentReviewStatus !== "published" ||
      params.parentActive !== true
    ) {
      activationBlockers.push("parent_not_released");
    }
  }

  if (params.reviewStatus !== "published") {
    activationBlockers.unshift("not_published");
  }

  return {
    publishBlockers: unique(publishBlockers),
    activationBlockers: unique(activationBlockers),
  };
}

export function readinessReasonAr(
  reason: MeasurementReadinessReason,
): string {
  switch (reason) {
    case "demo_content":
      return "المحتوى التجريبي لا يمكن اعتماده أو تفعيله.";
    case "not_published":
      return "يجب نشر العنصر أولًا قبل التفعيل.";
    case "missing_active_type_source":
      return "نوع القياس يحتاج مصدرًا طبيًا نشطًا قبل النشر أو التفعيل.";
    case "missing_source":
      return "لا يوجد مصدر مرتبط بالقاعدة.";
    case "inactive_source":
      return "المصدر المرتبط غير نشط حاليًا.";
    case "parent_not_released":
      return "نوع القياس الأب يجب أن يكون منشورًا ومفعّلًا.";
    case "missing_knowledge_sections":
      return "مقال المعرفة لا يحتوي أقسامًا جاهزة للمراجعة.";
    case "missing_knowledge_source":
      return "مقال المعرفة لا يحتوي مصدرًا مرتبطًا.";
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
