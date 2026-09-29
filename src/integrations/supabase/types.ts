export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_rate_limits: {
        Row: {
          bucket: string
          count: number
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          entity_version: number | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          entity_version?: number | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          entity_version?: number | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      condition_sources: {
        Row: {
          condition_id: string
          source_id: string
        }
        Insert: {
          condition_id: string
          source_id: string
        }
        Update: {
          condition_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_sources_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_symptoms: {
        Row: {
          condition_id: string
          created_at: string
          id: string
          is_active: boolean
          is_core_symptom: boolean
          is_demo: boolean
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          symptom_id: string
          weight: number
        }
        Insert: {
          condition_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_core_symptom?: boolean
          is_demo?: boolean
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          symptom_id: string
          weight?: number
        }
        Update: {
          condition_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_core_symptom?: boolean
          is_demo?: boolean
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          symptom_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "condition_symptoms_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_symptoms_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      conditions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          care_level: Database["public"]["Enums"]["care_level"]
          category: string | null
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          last_medical_review_at: string | null
          name_ar: string
          name_en: string | null
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          submitted_at: string | null
          summary_ar: string | null
          summary_en: string | null
          translation_status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
          when_to_seek_care_ar: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          care_level?: Database["public"]["Enums"]["care_level"]
          category?: string | null
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          last_medical_review_at?: string | null
          name_ar: string
          name_en?: string | null
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          submitted_at?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
          when_to_seek_care_ar?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          care_level?: Database["public"]["Enums"]["care_level"]
          category?: string | null
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          last_medical_review_at?: string | null
          name_ar?: string
          name_en?: string | null
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          submitted_at?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
          when_to_seek_care_ar?: string | null
        }
        Relationships: []
      }
      content_versions: {
        Row: {
          change_reason: string | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          published_at: string | null
          published_by: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          snapshot: Json
          source_ids: string[]
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot: Json
          source_ids?: string[]
          status?: string
          updated_at?: string
          version: number
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          snapshot?: Json
          source_ids?: string[]
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          available_24_7: boolean
          country_code: string
          id: string
          is_active: boolean
          last_verified_at: string | null
          name_ar: string
          name_en: string | null
          nationwide: boolean
          phone_number: string
          priority: number
          region_code: string | null
          service_type: Database["public"]["Enums"]["emergency_service_type"]
          source_id: string | null
          source_url: string | null
        }
        Insert: {
          available_24_7?: boolean
          country_code: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          name_ar: string
          name_en?: string | null
          nationwide?: boolean
          phone_number: string
          priority?: number
          region_code?: string | null
          service_type: Database["public"]["Enums"]["emergency_service_type"]
          source_id?: string | null
          source_url?: string | null
        }
        Update: {
          available_24_7?: boolean
          country_code?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          name_ar?: string
          name_en?: string | null
          nationwide?: boolean
          phone_number?: string
          priority?: number
          region_code?: string | null
          service_type?: Database["public"]["Enums"]["emergency_service_type"]
          source_id?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      first_aid_sections: {
        Row: {
          content_ar: string | null
          content_en: string | null
          id: string
          review_status: Database["public"]["Enums"]["review_status"]
          section_type: string
          sort_order: number
          title_ar: string
          title_en: string | null
          topic_id: string
        }
        Insert: {
          content_ar?: string | null
          content_en?: string | null
          id?: string
          review_status?: Database["public"]["Enums"]["review_status"]
          section_type: string
          sort_order?: number
          title_ar: string
          title_en?: string | null
          topic_id: string
        }
        Update: {
          content_ar?: string | null
          content_en?: string | null
          id?: string
          review_status?: Database["public"]["Enums"]["review_status"]
          section_type?: string
          sort_order?: number
          title_ar?: string
          title_en?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_aid_sections_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "first_aid_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      first_aid_sources: {
        Row: {
          first_aid_topic_id: string
          source_id: string
        }
        Insert: {
          first_aid_topic_id: string
          source_id: string
        }
        Update: {
          first_aid_topic_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_aid_sources_first_aid_topic_id_fkey"
            columns: ["first_aid_topic_id"]
            isOneToOne: false
            referencedRelation: "first_aid_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_aid_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      first_aid_topics: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_critical: boolean
          last_reviewed_at: string | null
          priority: number
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          summary_ar: string | null
          summary_en: string | null
          title_ar: string
          title_en: string | null
          translation_status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean
          last_reviewed_at?: string | null
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          title_ar: string
          title_en?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_critical?: boolean
          last_reviewed_at?: string | null
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          summary_ar?: string | null
          summary_en?: string | null
          title_ar?: string
          title_en?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      knowledge_releases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          manifest: Json
          notes: string | null
          published_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          manifest?: Json
          notes?: string | null
          published_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          manifest?: Json
          notes?: string | null
          published_at?: string
          version?: string
        }
        Relationships: []
      }
      external_source_registry: {
        Row: {
          base_url: string
          created_at: string
          display_name: string
          id: string
          integration_mode: string
          is_active: boolean
          last_verified_at: string | null
          license_model: string | null
          license_notes: string | null
          may_supply_clinical_content: boolean
          may_supply_population_data: boolean
          may_supply_terminology: boolean
          notes: string | null
          provider: string
          repository_url: string | null
          requires_credentials: boolean
          source_key: string
          source_kind: string
          trust_tier: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          display_name: string
          id?: string
          integration_mode: string
          is_active?: boolean
          last_verified_at?: string | null
          license_model?: string | null
          license_notes?: string | null
          may_supply_clinical_content?: boolean
          may_supply_population_data?: boolean
          may_supply_terminology?: boolean
          notes?: string | null
          provider: string
          repository_url?: string | null
          requires_credentials?: boolean
          source_key: string
          source_kind: string
          trust_tier: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          display_name?: string
          id?: string
          integration_mode?: string
          is_active?: boolean
          last_verified_at?: string | null
          license_model?: string | null
          license_notes?: string | null
          may_supply_clinical_content?: boolean
          may_supply_population_data?: boolean
          may_supply_terminology?: boolean
          notes?: string | null
          provider?: string
          repository_url?: string | null
          requires_credentials?: boolean
          source_key?: string
          source_kind?: string
          trust_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_engine_integrations: {
        Row: {
          capabilities: Json
          created_at: string
          display_name: string
          enabled: boolean
          endpoint_base: string | null
          id: string
          last_verified_at: string | null
          mode: string
          notes: string | null
          provider_key: string
          send_identifiable_health_data: boolean
          source_registry_id: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          display_name: string
          enabled?: boolean
          endpoint_base?: string | null
          id?: string
          last_verified_at?: string | null
          mode?: string
          notes?: string | null
          provider_key: string
          send_identifiable_health_data?: boolean
          source_registry_id: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          display_name?: string
          enabled?: boolean
          endpoint_base?: string | null
          id?: string
          last_verified_at?: string | null
          mode?: string
          notes?: string | null
          provider_key?: string
          send_identifiable_health_data?: boolean
          source_registry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_engine_integrations_source_registry_id_fkey"
            columns: ["source_registry_id"]
            isOneToOne: false
            referencedRelation: "external_source_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      terminology_mappings: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          external_code: string
          external_uri: string | null
          id: string
          last_verified_at: string | null
          mapping_method: string
          mapping_status: string
          notes: string | null
          preferred_term: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          semantic_type: string | null
          source_registry_id: string
          terminology_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          external_code: string
          external_uri?: string | null
          id?: string
          last_verified_at?: string | null
          mapping_method?: string
          mapping_status?: string
          notes?: string | null
          preferred_term?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          semantic_type?: string | null
          source_registry_id: string
          terminology_system: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          external_code?: string
          external_uri?: string | null
          id?: string
          last_verified_at?: string | null
          mapping_method?: string
          mapping_status?: string
          notes?: string | null
          preferred_term?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          semantic_type?: string | null
          source_registry_id?: string
          terminology_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminology_mappings_source_registry_id_fkey"
            columns: ["source_registry_id"]
            isOneToOne: false
            referencedRelation: "external_source_registry"
            referencedColumns: ["id"]
          },
        ]
      }

      medical_sources: {
        Row: {
          country: string | null
          evidence_level: string | null
          expires_review_at: string | null
          id: string
          is_active: boolean
          language: string | null
          last_checked_at: string | null
          last_verified_at: string | null
          notes: string | null
          organization: string | null
          organization_type: string | null
          publication_date: string | null
          published_at: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          url: string | null
        }
        Insert: {
          country?: string | null
          evidence_level?: string | null
          expires_review_at?: string | null
          id?: string
          is_active?: boolean
          language?: string | null
          last_checked_at?: string | null
          last_verified_at?: string | null
          notes?: string | null
          organization?: string | null
          organization_type?: string | null
          publication_date?: string | null
          published_at?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          title: string
          url?: string | null
        }
        Update: {
          country?: string | null
          evidence_level?: string | null
          expires_review_at?: string | null
          id?: string
          is_active?: boolean
          language?: string | null
          last_checked_at?: string | null
          last_verified_at?: string | null
          notes?: string | null
          organization?: string | null
          organization_type?: string | null
          publication_date?: string | null
          published_at?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_code: string
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          id: string
          preferred_language: string
          region_code: string | null
          sex: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id: string
          preferred_language?: string
          region_code?: string | null
          sex?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          id?: string
          preferred_language?: string
          region_code?: string | null
          sex?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          id: string
          label_ar: string
          label_en: string | null
          question_id: string
          sort_order: number
          value: string
        }
        Insert: {
          id?: string
          label_ar: string
          label_en?: string | null
          question_id: string
          sort_order?: number
          value: string
        }
        Update: {
          id?: string
          label_ar?: string
          label_en?: string | null
          question_id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_rules: {
        Row: {
          condition_id: string | null
          confirms_symptom_id: string | null
          expected_value: string | null
          id: string
          is_active: boolean
          operator: string
          parent_question_id: string | null
          priority: number
          question_id: string
          symptom_id: string | null
          trigger_type: string
        }
        Insert: {
          condition_id?: string | null
          confirms_symptom_id?: string | null
          expected_value?: string | null
          id?: string
          is_active?: boolean
          operator?: string
          parent_question_id?: string | null
          priority?: number
          question_id: string
          symptom_id?: string | null
          trigger_type: string
        }
        Update: {
          condition_id?: string | null
          confirms_symptom_id?: string | null
          expected_value?: string | null
          id?: string
          is_active?: boolean
          operator?: string
          parent_question_id?: string | null
          priority?: number
          question_id?: string
          symptom_id?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_rules_confirms_symptom_id_fkey"
            columns: ["confirms_symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_rules_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_rules_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_rules_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_rules_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      question_sources: {
        Row: {
          question_id: string
          source_id: string
        }
        Insert: {
          question_id: string
          source_id: string
        }
        Update: {
          question_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_sources_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          published_at: string | null
          published_by: string | null
          question_ar: string
          question_en: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          submitted_at: string | null
          translation_status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          published_at?: string | null
          published_by?: string | null
          question_ar: string
          question_en?: string | null
          question_type: Database["public"]["Enums"]["question_type"]
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_at?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          published_at?: string | null
          published_by?: string | null
          question_ar?: string
          question_en?: string | null
          question_type?: Database["public"]["Enums"]["question_type"]
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_at?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      red_flag_rules: {
        Row: {
          id: string
          is_active: boolean
          max_age: number | null
          min_age: number | null
          operator: string
          question_id: string | null
          red_flag_id: string
          severity: Database["public"]["Enums"]["severity_level"] | null
          symptom_id: string | null
          value: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number | null
          operator?: string
          question_id?: string | null
          red_flag_id: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          symptom_id?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          max_age?: number | null
          min_age?: number | null
          operator?: string
          question_id?: string | null
          red_flag_id?: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          symptom_id?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "red_flag_rules_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_rules_red_flag_id_fkey"
            columns: ["red_flag_id"]
            isOneToOne: false
            referencedRelation: "red_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_rules_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flag_sources: {
        Row: {
          red_flag_id: string
          source_id: string
        }
        Insert: {
          red_flag_id: string
          source_id: string
        }
        Update: {
          red_flag_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "red_flag_sources_red_flag_id_fkey"
            columns: ["red_flag_id"]
            isOneToOne: false
            referencedRelation: "red_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "red_flag_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      red_flags: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          care_level: Database["public"]["Enums"]["care_level"]
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          priority: number
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          title_ar: string
          title_en: string | null
          translation_status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          care_level: Database["public"]["Enums"]["care_level"]
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          title_ar: string
          title_en?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          care_level?: Database["public"]["Enums"]["care_level"]
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          title_ar?: string
          title_en?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      session_answers: {
        Row: {
          answer_value: Json
          created_at: string
          id: string
          question_id: string
          session_id: string
        }
        Insert: {
          answer_value: Json
          created_at?: string
          id?: string
          question_id: string
          session_id: string
        }
        Update: {
          answer_value?: Json
          created_at?: string
          id?: string
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "symptom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_results: {
        Row: {
          condition_id: string
          condition_version: number | null
          created_at: string
          engine_version: string
          explanation_data: Json
          id: string
          matching_level: Database["public"]["Enums"]["matching_level"]
          matching_score: number
          rank: number
          ruleset_version: string | null
          session_id: string
        }
        Insert: {
          condition_id: string
          condition_version?: number | null
          created_at?: string
          engine_version: string
          explanation_data?: Json
          id?: string
          matching_level: Database["public"]["Enums"]["matching_level"]
          matching_score: number
          rank: number
          ruleset_version?: string | null
          session_id: string
        }
        Update: {
          condition_id?: string
          condition_version?: number | null
          created_at?: string
          engine_version?: string
          explanation_data?: Json
          id?: string
          matching_level?: Database["public"]["Enums"]["matching_level"]
          matching_score?: number
          rank?: number
          ruleset_version?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_results_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "symptom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_symptoms: {
        Row: {
          aggravating_factors: string | null
          created_at: string
          id: string
          pattern: Database["public"]["Enums"]["symptom_pattern"] | null
          session_id: string
          severity: Database["public"]["Enums"]["severity_level"] | null
          started_when: string | null
          symptom_id: string
        }
        Insert: {
          aggravating_factors?: string | null
          created_at?: string
          id?: string
          pattern?: Database["public"]["Enums"]["symptom_pattern"] | null
          session_id: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          started_when?: string | null
          symptom_id: string
        }
        Update: {
          aggravating_factors?: string | null
          created_at?: string
          id?: string
          pattern?: Database["public"]["Enums"]["symptom_pattern"] | null
          session_id?: string
          severity?: Database["public"]["Enums"]["severity_level"] | null
          started_when?: string | null
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_symptoms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "symptom_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_symptoms_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_sessions: {
        Row: {
          age: number | null
          care_level: Database["public"]["Enums"]["care_level"] | null
          completed_at: string | null
          created_at: string
          free_text_description: string | null
          guest_session_id: string | null
          id: string
          knowledge_release_id: string | null
          knowledge_release_version: string | null
          pregnancy_status: string | null
          sex: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          user_id: string | null
        }
        Insert: {
          age?: number | null
          care_level?: Database["public"]["Enums"]["care_level"] | null
          completed_at?: string | null
          created_at?: string
          free_text_description?: string | null
          guest_session_id?: string | null
          id?: string
          knowledge_release_id?: string | null
          knowledge_release_version?: string | null
          pregnancy_status?: string | null
          sex?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string | null
        }
        Update: {
          age?: number | null
          care_level?: Database["public"]["Enums"]["care_level"] | null
          completed_at?: string | null
          created_at?: string
          free_text_description?: string | null
          guest_session_id?: string | null
          id?: string
          knowledge_release_id?: string | null
          knowledge_release_version?: string | null
          pregnancy_status?: string | null
          sex?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "symptom_sessions_knowledge_release_id_fkey"
            columns: ["knowledge_release_id"]
            isOneToOne: false
            referencedRelation: "knowledge_releases"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_sources: {
        Row: {
          source_id: string
          symptom_id: string
        }
        Insert: {
          source_id: string
          symptom_id: string
        }
        Update: {
          source_id?: string
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_sources_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }

      symptoms: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body_system: string | null
          category: string | null
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          is_red_flag_candidate: boolean
          name_ar: string
          name_en: string | null
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          submitted_at: string | null
          translation_status: Database["public"]["Enums"]["translation_status"]
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body_system?: string | null
          category?: string | null
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_red_flag_candidate?: boolean
          name_ar: string
          name_en?: string | null
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_at?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body_system?: string | null
          category?: string | null
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_red_flag_candidate?: boolean
          name_ar?: string
          name_en?: string | null
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          submitted_at?: string | null
          translation_status?: Database["public"]["Enums"]["translation_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_action_for: {
        Args: { _from: string; _to: string }
        Returns: string
      }
      can_transition: {
        Args: { _from: string; _to: string; _uid: string }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: { _bucket: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
      content_visible: {
        Args: { _is_demo: boolean; _status: string }
        Returns: boolean
      }
      create_knowledge_release: {
        Args: { _notes: string; _version: string }
        Returns: string
      }
      has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_session: { Args: { _session_id: string }; Returns: boolean }
      publish_content_version: {
        Args: { _version_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "content_editor"
        | "medical_reviewer"
        | "super_admin"
      care_level: "emergency" | "urgent" | "routine" | "self_care"
      emergency_service_type:
        | "ambulance"
        | "unified_emergency"
        | "health_consultation"
        | "police"
        | "civil_defense"
      matching_level: "high" | "medium" | "low"
      question_type:
        | "yes_no"
        | "yes_no_unsure"
        | "single_choice"
        | "multi_choice"
        | "number"
        | "text"
        | "severity"
        | "duration"
      relationship_type: "supports" | "weak_support" | "neutral" | "contradicts"
      review_status:
        | "draft"
        | "pending_review"
        | "reviewed"
        | "retired"
        | "in_review"
        | "changes_requested"
        | "approved"
        | "published"
      session_status:
        | "in_progress"
        | "completed"
        | "emergency_redirected"
        | "abandoned"
      severity_level: "mild" | "moderate" | "severe"
      source_type:
        | "guideline"
        | "government"
        | "academic"
        | "reference"
        | "clinical_guideline"
        | "systematic_review"
      symptom_pattern: "continuous" | "intermittent" | "unknown"
      translation_status: "not_started" | "in_progress" | "reviewed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "content_editor",
        "medical_reviewer",
        "super_admin",
      ],
      care_level: ["emergency", "urgent", "routine", "self_care"],
      emergency_service_type: [
        "ambulance",
        "unified_emergency",
        "health_consultation",
        "police",
        "civil_defense",
      ],
      matching_level: ["high", "medium", "low"],
      question_type: [
        "yes_no",
        "yes_no_unsure",
        "single_choice",
        "multi_choice",
        "number",
        "text",
        "severity",
        "duration",
      ],
      relationship_type: ["supports", "weak_support", "neutral", "contradicts"],
      review_status: [
        "draft",
        "pending_review",
        "reviewed",
        "retired",
        "in_review",
        "changes_requested",
        "approved",
        "published",
      ],
      session_status: [
        "in_progress",
        "completed",
        "emergency_redirected",
        "abandoned",
      ],
      severity_level: ["mild", "moderate", "severe"],
      source_type: [
        "guideline",
        "government",
        "academic",
        "reference",
        "clinical_guideline",
        "systematic_review",
      ],
      symptom_pattern: ["continuous", "intermittent", "unknown"],
      translation_status: ["not_started", "in_progress", "reviewed"],
    },
  },
} as const
