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
      first_aid_sections: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_reason: string | null
          content_ar: string | null
          content_en: string | null
          created_by: string | null
          id: string
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          section_type:
            | "what_is_happening"
            | "when_to_call"
            | "do_now"
            | "dont_do"
            | "while_waiting"
          sort_order: number
          submitted_at: string | null
          title_ar: string
          title_en: string | null
          topic_id: string
          translation_status: Database["public"]["Enums"]["translation_status"]
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          content_ar?: string | null
          content_en?: string | null
          created_by?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_type:
            | "what_is_happening"
            | "when_to_call"
            | "do_now"
            | "dont_do"
            | "while_waiting"
          sort_order?: number
          submitted_at?: string | null
          title_ar: string
          title_en?: string | null
          topic_id: string
          translation_status?: Database["public"]["Enums"]["translation_status"]
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          content_ar?: string | null
          content_en?: string | null
          created_by?: string | null
          id?: string
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          section_type?:
            | "what_is_happening"
            | "when_to_call"
            | "do_now"
            | "dont_do"
            | "while_waiting"
          sort_order?: number
          submitted_at?: string | null
          title_ar?: string
          title_en?: string | null
          topic_id?: string
          translation_status?: Database["public"]["Enums"]["translation_status"]
          version?: number
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
      measurement_knowledge_articles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience: "general" | "professional"
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          last_medical_review_at: string | null
          measurement_type_id: string
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          summary_ar: string
          summary_en: string | null
          title_ar: string
          title_en: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience: "general" | "professional"
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          last_medical_review_at?: string | null
          measurement_type_id: string
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          summary_ar: string
          summary_en?: string | null
          title_ar: string
          title_en?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: "general" | "professional"
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          last_medical_review_at?: string | null
          measurement_type_id?: string
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          summary_ar?: string
          summary_en?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_knowledge_articles_measurement_type_id_fkey"
            columns: ["measurement_type_id"]
            isOneToOne: false
            referencedRelation: "measurement_types"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_knowledge_sections: {
        Row: {
          article_id: string
          body_ar: string
          body_en: string | null
          created_at: string
          id: string
          section_type:
            | "overview"
            | "how_to_measure"
            | "common_errors"
            | "what_it_means"
            | "when_to_repeat"
            | "warning_signs"
            | "special_context"
            | "limitations"
          sort_order: number
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          article_id: string
          body_ar: string
          body_en?: string | null
          created_at?: string
          id?: string
          section_type:
            | "overview"
            | "how_to_measure"
            | "common_errors"
            | "what_it_means"
            | "when_to_repeat"
            | "warning_signs"
            | "special_context"
            | "limitations"
          sort_order?: number
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          article_id?: string
          body_ar?: string
          body_en?: string | null
          created_at?: string
          id?: string
          section_type?:
            | "overview"
            | "how_to_measure"
            | "common_errors"
            | "what_it_means"
            | "when_to_repeat"
            | "warning_signs"
            | "special_context"
            | "limitations"
          sort_order?: number
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_knowledge_sections_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "measurement_knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_knowledge_sources: {
        Row: {
          article_id: string
          created_at: string
          notes: string | null
          source_id: string
          source_role: "primary" | "supporting" | "safety" | "capture"
        }
        Insert: {
          article_id: string
          created_at?: string
          notes?: string | null
          source_id: string
          source_role: "primary" | "supporting" | "safety" | "capture"
        }
        Update: {
          article_id?: string
          created_at?: string
          notes?: string | null
          source_id?: string
          source_role?: "primary" | "supporting" | "safety" | "capture"
        }
        Relationships: [
          {
            foreignKeyName: "measurement_knowledge_sources_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "measurement_knowledge_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_knowledge_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_reminder_deliveries: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          provider_status: number | null
          schedule_id: string
          scheduled_for: string
          sent_at: string | null
          status: "pending" | "sent" | "failed"
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          provider_status?: number | null
          schedule_id: string
          scheduled_for: string
          sent_at?: string | null
          status?: "pending" | "sent" | "failed"
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          provider_status?: number | null
          schedule_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: "pending" | "sent" | "failed"
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminder_deliveries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "medication_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_reminder_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "web_push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      web_push_subscriptions: {
        Row: {
          auth_secret: string
          created_at: string
          endpoint: string
          expiration_time: number | null
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_secret: string
          created_at?: string
          endpoint: string
          expiration_time?: number | null
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_secret?: string
          created_at?: string
          endpoint?: string
          expiration_time?: number | null
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_journal_entries: {
        Row: {
          created_at: string
          energy_score: number | null
          entry_type: "general" | "symptom_note" | "mood" | "care_note"
          id: string
          mood_score: number | null
          note: string
          occurred_at: string
          related_measurement_reading_id: string | null
          related_symptom_session_id: string | null
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_score?: number | null
          entry_type?: "general" | "symptom_note" | "mood" | "care_note"
          id?: string
          mood_score?: number | null
          note: string
          occurred_at?: string
          related_measurement_reading_id?: string | null
          related_symptom_session_id?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy_score?: number | null
          entry_type?: "general" | "symptom_note" | "mood" | "care_note"
          id?: string
          mood_score?: number | null
          note?: string
          occurred_at?: string
          related_measurement_reading_id?: string | null
          related_symptom_session_id?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_journal_entries_related_measurement_reading_id_fkey"
            columns: ["related_measurement_reading_id"]
            isOneToOne: false
            referencedRelation: "measurement_readings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_journal_entries_related_symptom_session_id_fkey"
            columns: ["related_symptom_session_id"]
            isOneToOne: false
            referencedRelation: "symptom_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_dose_events: {
        Row: {
          created_at: string
          event_at: string
          id: string
          medication_id: string
          note: string | null
          schedule_id: string | null
          scheduled_for: string | null
          status: "taken" | "skipped"
          user_id: string
        }
        Insert: {
          created_at?: string
          event_at?: string
          id?: string
          medication_id: string
          note?: string | null
          schedule_id?: string | null
          scheduled_for?: string | null
          status: "taken" | "skipped"
          user_id: string
        }
        Update: {
          created_at?: string
          event_at?: string
          id?: string
          medication_id?: string
          note?: string | null
          schedule_id?: string | null
          scheduled_for?: string | null
          status?: "taken" | "skipped"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_dose_events_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "user_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_dose_events_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "medication_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_schedules: {
        Row: {
          created_at: string
          days_of_week: string[]
          end_date: string | null
          id: string
          label: string | null
          medication_id: string
          reminder_enabled: boolean
          start_date: string | null
          time_local: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: string[]
          end_date?: string | null
          id?: string
          label?: string | null
          medication_id: string
          reminder_enabled?: boolean
          start_date?: string | null
          time_local: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: string[]
          end_date?: string | null
          id?: string
          label?: string | null
          medication_id?: string
          reminder_enabled?: boolean
          start_date?: string | null
          time_local?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_schedules_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "user_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_medications: {
        Row: {
          created_at: string
          dose_text: string | null
          end_date: string | null
          id: string
          instructions_text: string | null
          is_active: boolean
          name: string
          schedule_text: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose_text?: string | null
          end_date?: string | null
          id?: string
          instructions_text?: string | null
          is_active?: boolean
          name: string
          schedule_text?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose_text?: string | null
          end_date?: string | null
          id?: string
          instructions_text?: string | null
          is_active?: boolean
          name?: string
          schedule_text?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      measurement_import_batches: {
        Row: {
          created_at: string
          file_sha256: string | null
          file_size_bytes: number
          id: string
          imported_count: number
          mapping: Json
          original_filename: string
          qa_summary: Json
          skipped_count: number
          source_row_count: number
          status: "imported"
          user_id: string
        }
        Insert: {
          created_at?: string
          file_sha256?: string | null
          file_size_bytes: number
          id?: string
          imported_count?: number
          mapping?: Json
          original_filename: string
          qa_summary?: Json
          skipped_count?: number
          source_row_count: number
          status?: "imported"
          user_id: string
        }
        Update: {
          created_at?: string
          file_sha256?: string | null
          file_size_bytes?: number
          id?: string
          imported_count?: number
          mapping?: Json
          original_filename?: string
          qa_summary?: Json
          skipped_count?: number
          source_row_count?: number
          status?: "imported"
          user_id?: string
        }
        Relationships: []
      }
      measurement_readings: {
        Row: {
          components: Json | null
          context: Json
          created_at: string
          id: string
          import_batch_id: string | null
          import_row_number: number | null
          measured_at: string
          measurement_type_id: string
          notes: string | null
          quality: "unknown" | "good" | "questionable"
          scalar_value: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          components?: Json | null
          context?: Json
          created_at?: string
          id?: string
          import_batch_id?: string | null
          import_row_number?: number | null
          measured_at: string
          measurement_type_id: string
          notes?: string | null
          quality?: "unknown" | "good" | "questionable"
          scalar_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          components?: Json | null
          context?: Json
          created_at?: string
          id?: string
          import_batch_id?: string | null
          import_row_number?: number | null
          measured_at?: string
          measurement_type_id?: string
          notes?: string | null
          quality?: "unknown" | "good" | "questionable"
          scalar_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_readings_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "measurement_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_readings_measurement_type_id_fkey"
            columns: ["measurement_type_id"]
            isOneToOne: false
            referencedRelation: "measurement_types"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_red_flags: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          care_level: Database["public"]["Enums"]["care_level"]
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          measurement_type_id: string
          predicate: Json
          priority: number
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
          submitted_at: string | null
          title_ar: string
          title_en: string | null
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
          id?: string
          is_active?: boolean
          is_demo?: boolean
          measurement_type_id: string
          predicate: Json
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
          submitted_at?: string | null
          title_ar: string
          title_en?: string | null
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
          id?: string
          is_active?: boolean
          is_demo?: boolean
          measurement_type_id?: string
          predicate?: Json
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
          submitted_at?: string | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_red_flags_measurement_type_id_fkey"
            columns: ["measurement_type_id"]
            isOneToOne: false
            referencedRelation: "measurement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_red_flags_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_reference_rules: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          care_level: Database["public"]["Enums"]["care_level"] | null
          change_reason: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          interpretation_code: string
          is_active: boolean
          is_demo: boolean
          label_ar: string
          label_en: string | null
          measurement_type_id: string
          predicate: Json
          priority: number
          published_at: string | null
          published_by: string | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
          submitted_at: string | null
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          care_level?: Database["public"]["Enums"]["care_level"] | null
          change_reason?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          interpretation_code: string
          is_active?: boolean
          is_demo?: boolean
          label_ar: string
          label_en?: string | null
          measurement_type_id: string
          predicate: Json
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          care_level?: Database["public"]["Enums"]["care_level"] | null
          change_reason?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interpretation_code?: string
          is_active?: boolean
          is_demo?: boolean
          label_ar?: string
          label_en?: string | null
          measurement_type_id?: string
          predicate?: Json
          priority?: number
          published_at?: string | null
          published_by?: string | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_reference_rules_measurement_type_id_fkey"
            columns: ["measurement_type_id"]
            isOneToOne: false
            referencedRelation: "measurement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_reference_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_sources: {
        Row: {
          created_at: string
          id: string
          last_verified_at: string | null
          measurement_type_id: string
          notes: string | null
          source_id: string
          use_scope:
            | "capture_guidance"
            | "reference_range"
            | "safety_threshold"
            | "terminology"
        }
        Insert: {
          created_at?: string
          id?: string
          last_verified_at?: string | null
          measurement_type_id: string
          notes?: string | null
          source_id: string
          use_scope:
            | "capture_guidance"
            | "reference_range"
            | "safety_threshold"
            | "terminology"
        }
        Update: {
          created_at?: string
          id?: string
          last_verified_at?: string | null
          measurement_type_id?: string
          notes?: string | null
          source_id?: string
          use_scope?:
            | "capture_guidance"
            | "reference_range"
            | "safety_threshold"
            | "terminology"
        }
        Relationships: [
          {
            foreignKeyName: "measurement_sources_measurement_type_id_fkey"
            columns: ["measurement_type_id"]
            isOneToOne: false
            referencedRelation: "measurement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "medical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_types: {
        Row: {
          allowed_units: string[]
          approved_at: string | null
          approved_by: string | null
          canonical_unit: string | null
          capture_context_schema: Json
          change_reason: string | null
          code: string
          component_schema: Json
          created_at: string
          created_by: string | null
          description_ar: string | null
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
          submitted_at: string | null
          updated_at: string
          value_kind: "scalar" | "compound"
          version: number
        }
        Insert: {
          allowed_units?: string[]
          approved_at?: string | null
          approved_by?: string | null
          canonical_unit?: string | null
          capture_context_schema?: Json
          change_reason?: string | null
          code: string
          component_schema?: Json
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
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
          submitted_at?: string | null
          updated_at?: string
          value_kind: "scalar" | "compound"
          version?: number
        }
        Update: {
          allowed_units?: string[]
          approved_at?: string | null
          approved_by?: string | null
          canonical_unit?: string | null
          capture_context_schema?: Json
          change_reason?: string | null
          code?: string
          component_schema?: Json
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
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
          submitted_at?: string | null
          updated_at?: string
          value_kind?: "scalar" | "compound"
          version?: number
        }
        Relationships: []
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
            foreignKeyName: "question_rules_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_rules_confirms_symptom_id_fkey"
            columns: ["confirms_symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
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
          extraction_meta: Json | null
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
          extraction_meta?: Json | null
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
          extraction_meta?: Json | null
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
      claim_web_push_subscription: {
        Args: {
          p_auth_secret: string
          p_endpoint: string
          p_expiration_time?: number | null
          p_p256dh: string
          p_user_agent?: string | null
        }
        Returns: string
      }
      import_measurement_reading_batch: {
        Args: {
          p_file_sha256: string
          p_file_size_bytes: number
          p_mapping: Json
          p_original_filename: string
          p_qa_summary: Json
          p_rows: Json
          p_source_row_count: number
        }
        Returns: Json
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
