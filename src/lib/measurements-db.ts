import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type ReviewStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "retired";

export interface MeasurementTypeRow {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  value_kind: "scalar" | "compound";
  canonical_unit: string | null;
  allowed_units: string[];
  component_schema: Json;
  capture_context_schema: Json;
  review_status: ReviewStatus;
  is_active: boolean;
  is_demo: boolean;
  version: number;
}

export interface MeasurementReadingRow {
  id: string;
  user_id: string;
  measurement_type_id: string;
  measured_at: string;
  scalar_value: number | null;
  unit: string | null;
  components: Json | null;
  context: Json;
  quality: "unknown" | "good" | "questionable";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeasurementKnowledgeArticleRow {
  id: string;
  measurement_type_id: string;
  code: string;
  audience: "general" | "professional";
  title_ar: string;
  title_en: string | null;
  summary_ar: string;
  summary_en: string | null;
  review_status: ReviewStatus;
  is_active: boolean;
  is_demo: boolean;
  version: number;
  last_medical_review_at: string | null;
}

export interface MeasurementKnowledgeSectionRow {
  id: string;
  article_id: string;
  section_type:
    | "overview"
    | "how_to_measure"
    | "common_errors"
    | "what_it_means"
    | "when_to_repeat"
    | "warning_signs"
    | "special_context"
    | "limitations";
  title_ar: string;
  title_en: string | null;
  body_ar: string;
  body_en: string | null;
  sort_order: number;
}

type MeasurementTables = {
  measurement_types: {
    Row: MeasurementTypeRow;
    Insert: Partial<MeasurementTypeRow>;
    Update: Partial<MeasurementTypeRow>;
    Relationships: [];
  };
  measurement_readings: {
    Row: MeasurementReadingRow;
    Insert: {
      user_id: string;
      measurement_type_id: string;
      measured_at: string;
      scalar_value?: number | null;
      unit?: string | null;
      components?: Json | null;
      context?: Json;
      quality?: "unknown" | "good" | "questionable";
      notes?: string | null;
    };
    Update: Partial<MeasurementReadingRow>;
    Relationships: [];
  };
  measurement_knowledge_articles: {
    Row: MeasurementKnowledgeArticleRow;
    Insert: Partial<MeasurementKnowledgeArticleRow>;
    Update: Partial<MeasurementKnowledgeArticleRow>;
    Relationships: [];
  };
  measurement_knowledge_sections: {
    Row: MeasurementKnowledgeSectionRow;
    Insert: Partial<MeasurementKnowledgeSectionRow>;
    Update: Partial<MeasurementKnowledgeSectionRow>;
    Relationships: [];
  };
};

type MeasurementsDatabase = {
  public: {
    Tables: MeasurementTables;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const measurementsDb =
  supabase as unknown as SupabaseClient<MeasurementsDatabase>;
