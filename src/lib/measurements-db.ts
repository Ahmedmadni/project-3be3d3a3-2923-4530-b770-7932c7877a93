import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/** Rows as returned by the column lists the UI selects; other columns are optional. */
type Selected<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;

export type MeasurementTypeRow = Selected<
  Tables<"measurement_types">,
  | "id"
  | "code"
  | "name_ar"
  | "name_en"
  | "description_ar"
  | "value_kind"
  | "canonical_unit"
  | "allowed_units"
  | "component_schema"
  | "capture_context_schema"
  | "review_status"
  | "is_active"
  | "is_demo"
  | "version"
>;
export type MeasurementReadingRow = Selected<
  Tables<"measurement_readings">,
  | "id"
  | "user_id"
  | "measurement_type_id"
  | "measured_at"
  | "scalar_value"
  | "unit"
  | "components"
  | "context"
  | "quality"
  | "notes"
  | "created_at"
  | "updated_at"
>;
export type MeasurementKnowledgeArticleRow = Selected<
  Tables<"measurement_knowledge_articles">,
  | "id"
  | "measurement_type_id"
  | "code"
  | "audience"
  | "title_ar"
  | "title_en"
  | "summary_ar"
  | "summary_en"
  | "review_status"
  | "is_active"
  | "is_demo"
  | "version"
  | "last_medical_review_at"
>;
export type MeasurementKnowledgeSectionRow = Selected<
  Tables<"measurement_knowledge_sections">,
  | "id"
  | "article_id"
  | "section_type"
  | "title_ar"
  | "title_en"
  | "body_ar"
  | "body_en"
  | "sort_order"
>;

export const measurementsDb = supabase;
