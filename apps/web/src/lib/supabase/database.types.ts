export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      billing_events: {
        Row: {
          attempt_count: number
          created_at: string
          event_type: string
          id: string
          last_attempted_at: string | null
          payload: Json
          processed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_token: string | null
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_event_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_type: string
          id?: string
          last_attempted_at?: string | null
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_token?: string | null
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_event_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_type?: string
          id?: string
          last_attempted_at?: string | null
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_token?: string | null
          provider?: Database["public"]["Enums"]["billing_provider"]
          provider_event_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      checkout_rate_limits: {
        Row: {
          action: string
          request_count: number
          user_id: string
          window_started_at: string
        }
        Insert: {
          action: string
          request_count: number
          user_id: string
          window_started_at: string
        }
        Update: {
          action?: string
          request_count?: number
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
      }
      content_access_rules: {
        Row: {
          content_id: string
          entitlement_id: string
        }
        Insert: {
          content_id: string
          entitlement_id: string
        }
        Update: {
          content_id?: string
          entitlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_access_rules_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_access_rules_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          body_markdown: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          revision: number
          slug: string
          summary: string
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          body_markdown: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          revision?: number
          slug: string
          summary: string
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          body_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          revision?: number
          slug?: string
          summary?: string
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          description: string
          id: string
          label: string
        }
        Insert: {
          description: string
          id: string
          label: string
        }
        Update: {
          description?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          description: string
          id: Database["public"]["Enums"]["membership_tier"]
          monthly_price: number
          name: string
          revenuecat_entitlement: string | null
          stripe_lookup_key: string | null
        }
        Insert: {
          description: string
          id: Database["public"]["Enums"]["membership_tier"]
          monthly_price: number
          name: string
          revenuecat_entitlement?: string | null
          stripe_lookup_key?: string | null
        }
        Update: {
          description?: string
          id?: Database["public"]["Enums"]["membership_tier"]
          monthly_price?: number
          name?: string
          revenuecat_entitlement?: string | null
          stripe_lookup_key?: string | null
        }
        Relationships: []
      }
      office_hour_sessions: {
        Row: {
          created_at: string
          id: string
          replay_url: string | null
          required_entitlement_id: string | null
          revision: number
          signup_url: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          replay_url?: string | null
          required_entitlement_id?: string | null
          revision?: number
          signup_url: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          replay_url?: string | null
          required_entitlement_id?: string | null
          revision?: number
          signup_url?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hour_sessions_required_entitlement_id_fkey"
            columns: ["required_entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_entitlements: {
        Row: {
          entitlement_id: string
          plan_id: Database["public"]["Enums"]["membership_tier"]
        }
        Insert: {
          entitlement_id: string
          plan_id: Database["public"]["Enums"]["membership_tier"]
        }
        Update: {
          entitlement_id?: string
          plan_id?: Database["public"]["Enums"]["membership_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      product_asset_cleanup_jobs: {
        Row: {
          attempt_count: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          id: string
          last_attempted_at: string | null
          last_error: string | null
          not_before: string
          processed_at: string | null
          product_id: string | null
          reason: string
          status: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          last_error?: string | null
          not_before?: string
          processed_at?: string | null
          product_id?: string | null
          reason: string
          status?: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          last_error?: string | null
          not_before?: string
          processed_at?: string | null
          product_id?: string | null
          reason?: string
          status?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_asset_cleanup_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assets: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          original_filename: string
          product_id: string
          revision: number
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          original_filename: string
          product_id: string
          revision?: number
          size_bytes: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          original_filename?: string
          product_id?: string
          revision?: number
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_checkout_intents: {
        Row: {
          created_at: string
          expires_at: string
          product_id: string
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          product_id: string
          request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          product_id?: string
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_checkout_intents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_checkout_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bullets: string[]
          created_at: string
          entitlement_id: string | null
          id: string
          is_active: boolean
          price_cents: number
          price_label: string
          revision: number
          slug: string
          stripe_price_id: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          bullets?: string[]
          created_at?: string
          entitlement_id?: string | null
          id?: string
          is_active?: boolean
          price_cents?: number
          price_label?: string
          revision?: number
          slug: string
          stripe_price_id?: string | null
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          bullets?: string[]
          created_at?: string
          entitlement_id?: string | null
          id?: string
          is_active?: boolean
          price_cents?: number
          price_label?: string
          revision?: number
          slug?: string
          stripe_price_id?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          tier: Database["public"]["Enums"]["membership_tier"]
          timezone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          tier?: Database["public"]["Enums"]["membership_tier"]
          timezone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["membership_tier"]
          timezone?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          dispute_id: string | null
          dispute_observed_at: string | null
          dispute_status: string | null
          id: string
          product_id: string
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_payment_id: string
          status: string
          status_observed_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dispute_id?: string | null
          dispute_observed_at?: string | null
          dispute_status?: string | null
          id?: string
          product_id: string
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_payment_id: string
          status: string
          status_observed_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dispute_id?: string | null
          dispute_observed_at?: string | null
          dispute_status?: string | null
          id?: string
          product_id?: string
          provider?: Database["public"]["Enums"]["billing_provider"]
          provider_payment_id?: string
          status?: string
          status_observed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_events: {
        Row: {
          actor_user_id: string | null
          assigned_role: Database["public"]["Enums"]["user_role"]
          change_source: string
          created_at: string
          id: string
          previous_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          assigned_role: Database["public"]["Enums"]["user_role"]
          change_source?: string
          created_at?: string
          id?: string
          previous_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }
        Update: {
          actor_user_id?: string | null
          assigned_role?: Database["public"]["Enums"]["user_role"]
          change_source?: string
          created_at?: string
          id?: string
          previous_role?: Database["public"]["Enums"]["user_role"]
          target_user_id?: string
        }
        Relationships: []
      }
      subscription_billing_adjustments: {
        Row: {
          amount: number
          blocks_access: boolean
          created_at: string
          currency: string
          id: string
          kind: string
          observed_at: string
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_adjustment_id: string
          provider_payment_id: string
          status: string
          subscription_id: string
          superseded_at: string | null
          superseded_by_provider_payment_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          blocks_access: boolean
          created_at?: string
          currency: string
          id?: string
          kind: string
          observed_at: string
          provider?: Database["public"]["Enums"]["billing_provider"]
          provider_adjustment_id: string
          provider_payment_id: string
          status: string
          subscription_id: string
          superseded_at?: string | null
          superseded_by_provider_payment_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          blocks_access?: boolean
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          observed_at?: string
          provider?: Database["public"]["Enums"]["billing_provider"]
          provider_adjustment_id?: string
          provider_payment_id?: string
          status?: string
          subscription_id?: string
          superseded_at?: string | null
          superseded_by_provider_payment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_billing_adjustments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_checkout_intents: {
        Row: {
          created_at: string
          expires_at: string
          request_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          request_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          request_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_checkout_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_ends_at: string | null
          id: string
          latest_paid_observed_at: string | null
          latest_paid_provider_payment_id: string | null
          plan_id: Database["public"]["Enums"]["membership_tier"]
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_customer_id: string | null
          provider_subscription_id: string
          provider_synced_at: string
          reconciliation_closed_at: string | null
          status: string
          status_observed_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          latest_paid_observed_at?: string | null
          latest_paid_provider_payment_id?: string | null
          plan_id: Database["public"]["Enums"]["membership_tier"]
          provider: Database["public"]["Enums"]["billing_provider"]
          provider_customer_id?: string | null
          provider_subscription_id: string
          provider_synced_at?: string
          reconciliation_closed_at?: string | null
          status: string
          status_observed_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          latest_paid_observed_at?: string | null
          latest_paid_provider_payment_id?: string | null
          plan_id?: Database["public"]["Enums"]["membership_tier"]
          provider?: Database["public"]["Enums"]["billing_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string
          provider_synced_at?: string
          reconciliation_closed_at?: string | null
          status?: string
          status_observed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_entitlements: {
        Row: {
          ends_at: string | null
          entitlement_id: string
          source_id: string
          source_type: string
          starts_at: string
          user_id: string
        }
        Insert: {
          ends_at?: string | null
          entitlement_id: string
          source_id: string
          source_type: string
          starts_at?: string
          user_id: string
        }
        Update: {
          ends_at?: string | null
          entitlement_id?: string
          source_id?: string
          source_type?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_product: {
        Args: { p_expected_revision: number; p_product_id: string }
        Returns: {
          id: string
          revision: number
          slug: string
        }[]
      }
      begin_billing_event_attempt: {
        Args: { p_billing_event_id: string }
        Returns: Json
      }
      bootstrap_first_admin: {
        Args: { p_target_email: string }
        Returns: {
          assigned_role: Database["public"]["Enums"]["user_role"]
          changed_at: string
          previous_role: Database["public"]["Enums"]["user_role"]
          target_user_id: string
        }[]
      }
      bootstrap_user_profile: { Args: never; Returns: string }
      claim_product_asset_cleanup_jobs: {
        Args: { p_cleanup_job_id?: string; p_limit?: number }
        Returns: {
          claim_token: string
          id: string
          product_id: string
          storage_path: string
        }[]
      }
      claim_product_checkout: {
        Args: { p_product_id: string; p_request_id: string }
        Returns: {
          expires_at: string
          outcome: string
        }[]
      }
      claim_subscription_checkout: {
        Args: { p_request_id: string }
        Returns: {
          expires_at: string
          outcome: string
        }[]
      }
      close_missing_stripe_customer_subscriptions: {
        Args: {
          p_provider_customer_id: string
          p_reconciliation_started_at: string
          p_remote_subscription_ids: string[]
        }
        Returns: number
      }
      consume_checkout_rate_limit: {
        Args: { p_action: string }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      delete_content_item: {
        Args: { p_content_id: string; p_expected_revision: number }
        Returns: boolean
      }
      delete_office_hour: {
        Args: { p_expected_revision: number; p_office_hour_id: string }
        Returns: boolean
      }
      delete_product_asset: {
        Args: { p_expected_revision: number; p_product_id: string }
        Returns: {
          cleanup_job_id: string
          storage_path: string
        }[]
      }
      finish_billing_event_attempt: {
        Args: {
          p_billing_event_id: string
          p_claim_token: string
          p_error?: string
          p_result_status?: string
          p_succeeded: boolean
        }
        Returns: Json
      }
      get_phase2_billing_schema_readiness: {
        Args: never
        Returns: {
          access_helper: boolean
          adjustment_constraints: boolean
          adjustment_rls: boolean
          adjustment_sync_rpc: boolean
          adjustment_table: boolean
          authenticated_no_write: boolean
          paid_reconciliation_rpc: boolean
          receipt_allowlist: boolean
          service_role_grants: boolean
        }[]
      }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_editor_or_admin: { Args: never; Returns: boolean }
      list_managed_users: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string }
        Returns: Json
      }
      prepare_product_asset_upload: {
        Args: { p_product_id: string; p_storage_path: string }
        Returns: string
      }
      recompute_stripe_subscription_access: {
        Args: { p_effective_observed_at?: string; p_subscription_id: string }
        Returns: Database["public"]["Enums"]["membership_tier"]
      }
      reconcile_stripe_subscription_paid_payment: {
        Args: {
          p_observed_at?: string
          p_provider_payment_id: string
          p_provider_subscription_id: string
        }
        Returns: Database["public"]["Enums"]["membership_tier"]
      }
      record_product_asset_cleanup_attempt: {
        Args: {
          p_claim_token?: string
          p_cleanup_job_id: string
          p_error?: string
          p_succeeded: boolean
        }
        Returns: {
          attempt_count: number
          id: string
          processed_at: string
          status: string
        }[]
      }
      replace_product_asset: {
        Args: {
          p_content_type: string
          p_expected_revision?: number
          p_original_filename: string
          p_product_id: string
          p_size_bytes: number
          p_storage_path: string
          p_upload_cleanup_job_id: string
        }
        Returns: {
          cleanup_job_id: string
          id: string
          original_filename: string
          previous_storage_path: string
          revision: number
          size_bytes: number
        }[]
      }
      service_role_readiness: { Args: never; Returns: boolean }
      set_user_access_role: {
        Args: {
          p_access_role: Database["public"]["Enums"]["user_role"]
          p_target_user_id: string
        }
        Returns: {
          assigned_role: Database["public"]["Enums"]["user_role"]
          changed_at: string
          previous_role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      sync_stripe_product_dispute: {
        Args: {
          p_observed_at?: string
          p_provider_dispute_id: string
          p_provider_payment_id: string
          p_status: string
        }
        Returns: string
      }
      sync_stripe_product_purchase: {
        Args: {
          p_observed_at?: string
          p_product_id: string
          p_provider_payment_id: string
          p_status: string
          p_user_id: string
        }
        Returns: string
      }
      sync_stripe_product_refund: {
        Args: {
          p_observed_at?: string
          p_provider_payment_id: string
          p_status: string
        }
        Returns: string
      }
      sync_stripe_subscription_adjustment: {
        Args: {
          p_amount: number
          p_currency: string
          p_kind: string
          p_observed_at?: string
          p_provider_adjustment_id: string
          p_provider_payment_id: string
          p_provider_subscription_id: string
          p_status: string
        }
        Returns: string
      }
      sync_stripe_subscription_state: {
        Args: {
          p_cancel_at_period_end?: boolean
          p_cancelled_at?: string
          p_current_period_ends_at?: string
          p_observed_at?: string
          p_plan_id: Database["public"]["Enums"]["membership_tier"]
          p_provider_customer_id: string
          p_provider_subscription_id: string
          p_status: string
          p_user_id: string
        }
        Returns: Database["public"]["Enums"]["membership_tier"]
      }
      upsert_content_item: {
        Args: {
          p_body_markdown: string
          p_content_id: string
          p_cover_image_url: string
          p_expected_revision?: number
          p_published: boolean
          p_required_entitlements: string[]
          p_slug: string
          p_summary: string
          p_title: string
          p_type: Database["public"]["Enums"]["content_type"]
          p_visibility: Database["public"]["Enums"]["visibility"]
        }
        Returns: {
          id: string
          slug: string
        }[]
      }
      upsert_office_hour: {
        Args: {
          p_expected_revision?: number
          p_office_hour_id: string
          p_replay_url: string
          p_required_entitlement_id: string
          p_signup_url: string
          p_starts_at: string
          p_title: string
        }
        Returns: {
          id: string
          revision: number
        }[]
      }
      upsert_product: {
        Args: {
          p_bullets: string[]
          p_entitlement_id: string
          p_expected_revision?: number
          p_is_active: boolean
          p_price_cents: number
          p_price_label: string
          p_product_id: string
          p_slug: string
          p_stripe_price_id: string
          p_summary: string
          p_title: string
        }
        Returns: {
          id: string
          revision: number
          slug: string
        }[]
      }
    }
    Enums: {
      billing_provider: "stripe" | "app_store" | "play_store"
      content_type:
        | "article"
        | "case_study"
        | "template"
        | "monthly_update"
        | "product"
        | "office_hour_session"
      membership_tier: "free" | "tier_1" | "tier_2" | "tier_3"
      user_role: "member" | "editor" | "admin"
      visibility: "public" | "members_only" | "purchase_required"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      billing_provider: ["stripe", "app_store", "play_store"],
      content_type: [
        "article",
        "case_study",
        "template",
        "monthly_update",
        "product",
        "office_hour_session",
      ],
      membership_tier: ["free", "tier_1", "tier_2", "tier_3"],
      user_role: ["member", "editor", "admin"],
      visibility: ["public", "members_only", "purchase_required"],
    },
  },
} as const

