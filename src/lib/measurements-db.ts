import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MeasurementTypeRow = Tables<"measurement_types">;
export type MeasurementReadingRow = Tables<"measurement_readings">;
export type MeasurementKnowledgeArticleRow =
  Tables<"measurement_knowledge_articles">;
export type MeasurementKnowledgeSectionRow =
  Tables<"measurement_knowledge_sections">;

export const measurementsDb = supabase;
