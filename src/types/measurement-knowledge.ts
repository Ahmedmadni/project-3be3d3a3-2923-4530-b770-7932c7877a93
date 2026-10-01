export type MeasurementKnowledgeAudience = "general" | "professional";

export type MeasurementKnowledgeSectionType =
  | "overview"
  | "how_to_measure"
  | "common_errors"
  | "what_it_means"
  | "when_to_repeat"
  | "warning_signs"
  | "special_context"
  | "limitations";

export interface MeasurementKnowledgeArticle {
  id: string;
  measurementTypeId: string;
  code: string;
  audience: MeasurementKnowledgeAudience;
  titleAr: string;
  summaryAr: string;
  reviewStatus:
    | "draft"
    | "in_review"
    | "changes_requested"
    | "approved"
    | "published"
    | "retired";
  isActive: boolean;
  isDemo: boolean;
  version: number;
  lastMedicalReviewAt?: string | null;
}

export interface MeasurementKnowledgeSection {
  id: string;
  articleId: string;
  sectionType: MeasurementKnowledgeSectionType;
  titleAr: string;
  bodyAr: string;
  sortOrder: number;
}

export interface MeasurementKnowledgeSource {
  articleId: string;
  sourceId: string;
  sourceRole: "primary" | "supporting" | "safety" | "capture";
}

export interface MeasurementKnowledgeBundle {
  article: MeasurementKnowledgeArticle;
  sections: MeasurementKnowledgeSection[];
  sources: MeasurementKnowledgeSource[];
}
