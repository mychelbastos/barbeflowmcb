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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          staff_id: string | null
          starts_at: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          staff_id?: string | null
          starts_at: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          staff_id?: string | null
          starts_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_holds: {
        Row: {
          created_at: string
          ends_at: string
          expires_at: string
          id: string
          remote_jid: string
          service_id: string | null
          staff_id: string | null
          starts_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          expires_at: string
          id?: string
          remote_jid: string
          service_id?: string | null
          staff_id?: string | null
          starts_at: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          expires_at?: string
          id?: string
          remote_jid?: string
          service_id?: string | null
          staff_id?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_holds_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_holds_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_holds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_items: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          paid_at: string | null
          paid_status: string
          payment_id: string | null
          purchase_price_cents: number
          quantity: number
          receipt_id: string | null
          ref_id: string | null
          staff_id: string | null
          tenant_id: string
          title: string
          total_price_cents: number
          type: string
          unit_price_cents: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_status?: string
          payment_id?: string | null
          purchase_price_cents?: number
          quantity?: number
          receipt_id?: string | null
          ref_id?: string | null
          staff_id?: string | null
          tenant_id: string
          title: string
          total_price_cents?: number
          type: string
          unit_price_cents?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_status?: string
          payment_id?: string | null
          purchase_price_cents?: number
          quantity?: number
          receipt_id?: string | null
          ref_id?: string | null
          staff_id?: string | null
          tenant_id?: string
          title?: string
          total_price_cents?: number
          type?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          comanda_status: string
          created_at: string
          created_via: string | null
          customer_id: string
          customer_package_id: string | null
          customer_subscription_id: string | null
          ends_at: string
          id: string
          notes: string | null
          reminder_sent: boolean | null
          service_id: string
          session_outcome: string | null
          staff_id: string | null
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          comanda_status?: string
          created_at?: string
          created_via?: string | null
          customer_id: string
          customer_package_id?: string | null
          customer_subscription_id?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          service_id: string
          session_outcome?: string | null
          staff_id?: string | null
          starts_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          comanda_status?: string
          created_at?: string
          created_via?: string | null
          customer_id?: string
          customer_package_id?: string | null
          customer_subscription_id?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          service_id?: string
          session_outcome?: string | null
          staff_id?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_entries: {
        Row: {
          amount_cents: number
          booking_id: string | null
          created_at: string | null
          id: string
          kind: string
          notes: string | null
          occurred_at: string
          payment_id: string | null
          payment_method: string | null
          session_id: string | null
          source: string | null
          staff_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          kind: string
          notes?: string | null
          occurred_at?: string
          payment_id?: string | null
          payment_method?: string | null
          session_id?: string | null
          source?: string | null
          staff_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          kind?: string
          notes?: string | null
          occurred_at?: string
          payment_id?: string | null
          payment_method?: string | null
          session_id?: string | null
          source?: string | null
          staff_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "cash_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "v_daily_cash_summary"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "cash_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount_cents: number | null
          created_at: string
          difference_cents: number | null
          difference_reason: string | null
          expected_amount_cents: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount_cents: number
          status: string
          tenant_id: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount_cents?: number | null
          created_at?: string
          difference_cents?: number | null
          difference_reason?: string | null
          expected_amount_cents?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount_cents?: number
          status?: string
          tenant_id: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount_cents?: number | null
          created_at?: string
          difference_cents?: number | null
          difference_reason?: string | null
          expected_amount_cents?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount_cents?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_balance_entries: {
        Row: {
          amount_cents: number
          booking_id: string | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          staff_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          staff_id?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          staff_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_balance_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_balance_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "customer_balance_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_balance_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_balance_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_package_services: {
        Row: {
          created_at: string
          customer_package_id: string
          id: string
          service_id: string
          sessions_total: number
          sessions_used: number
        }
        Insert: {
          created_at?: string
          customer_package_id: string
          id?: string
          service_id: string
          sessions_total?: number
          sessions_used?: number
        }
        Update: {
          created_at?: string
          customer_package_id?: string
          id?: string
          service_id?: string
          sessions_total?: number
          sessions_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_package_services_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          package_id: string
          payment_status: string
          purchased_at: string
          sessions_total: number
          sessions_used: number
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          package_id: string
          payment_status?: string
          purchased_at?: string
          sessions_total: number
          sessions_used?: number
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          payment_status?: string
          purchased_at?: string
          sessions_total?: number
          sessions_used?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_packages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_subscriptions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          checkout_url: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          failed_at: string | null
          id: string
          mp_payer_id: string | null
          mp_preapproval_id: string | null
          next_payment_date: string | null
          plan_id: string
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checkout_url?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          failed_at?: string | null
          id?: string
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          plan_id: string
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checkout_url?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          failed_at?: string | null
          id?: string
          mp_payer_id?: string | null
          mp_preapproval_id?: string | null
          next_payment_date?: string | null
          plan_id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birthday: string | null
          cancellation_streak: number
          created_at: string
          email: string | null
          forced_online_payment: boolean
          id: string
          name: string
          notes: string | null
          phone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          birthday?: string | null
          cancellation_streak?: number
          created_at?: string
          email?: string | null
          forced_online_payment?: boolean
          id?: string
          name: string
          notes?: string | null
          phone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          birthday?: string | null
          cancellation_streak?: number
          created_at?: string
          email?: string | null
          forced_online_payment?: boolean
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mercadopago_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          mp_user_id: string | null
          public_key: string | null
          refresh_token: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          mp_user_id?: string | null
          public_key?: string | null
          refresh_token?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          mp_user_id?: string | null
          public_key?: string | null
          refresh_token?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercadopago_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          booking_id: string | null
          created_at: string
          customer_id: string | null
          dedup_key: string
          event_type: string
          id: string
          sent_at: string
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          dedup_key: string
          event_type: string
          id?: string
          sent_at?: string
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          customer_id?: string | null
          dedup_key?: string
          event_type?: string
          id?: string
          sent_at?: string
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "notification_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      package_services: {
        Row: {
          created_at: string
          id: string
          package_id: string
          service_id: string
          sessions_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          service_id: string
          sessions_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          service_id?: string
          sessions_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          customer_package_id: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          provider: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_package_id?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_package_id?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          provider?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payments_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          billing_cycle: string
          created_at: string
          features: Json | null
          id: string
          max_bookings_month: number | null
          max_staff: number | null
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          features?: Json | null
          id?: string
          max_bookings_month?: number | null
          max_staff?: number | null
          name: string
          price_cents: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          features?: Json | null
          id?: string
          max_bookings_month?: number | null
          max_staff?: number | null
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_sales: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          purchase_price_snapshot_cents: number
          quantity: number
          sale_date: string
          sale_price_snapshot_cents: number
          staff_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          purchase_price_snapshot_cents: number
          quantity?: number
          sale_date?: string
          sale_price_snapshot_cents: number
          staff_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          purchase_price_snapshot_cents?: number
          quantity?: number
          sale_date?: string
          sale_price_snapshot_cents?: number
          staff_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          purchase_price_cents: number
          sale_price_cents: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          purchase_price_cents?: number
          sale_price_cents?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          purchase_price_cents?: number
          sale_price_cents?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_clients: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          duration_minutes: number
          id: string
          notes: string | null
          service_id: string | null
          staff_id: string
          start_date: string
          start_time: string
          tenant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_id: string
          duration_minutes: number
          id?: string
          notes?: string | null
          service_id?: string | null
          staff_id: string
          start_date?: string
          start_time: string
          tenant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          service_id?: string | null
          staff_id?: string
          start_date?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_clients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_clients_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_clients_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          active: boolean | null
          break_end: string | null
          break_start: string | null
          created_at: string
          end_time: string
          id: string
          staff_id: string | null
          start_time: string
          tenant_id: string
          weekday: number
        }
        Insert: {
          active?: boolean | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          end_time: string
          id?: string
          staff_id?: string | null
          start_time: string
          tenant_id: string
          weekday: number
        }
        Update: {
          active?: boolean | null
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          end_time?: string
          id?: string
          staff_id?: string | null
          start_time?: string
          tenant_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          photo_url: string | null
          price_cents: number
          public: boolean
          service_id: string | null
          tenant_id: string
          total_sessions: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          price_cents: number
          public?: boolean
          service_id?: string | null
          tenant_id: string
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          price_cents?: number
          public?: boolean
          service_id?: string | null
          tenant_id?: string
          total_sessions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          photo_url: string | null
          price_cents: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          photo_url?: string | null
          price_cents?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          photo_url?: string | null
          price_cents?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean | null
          bio: string | null
          color: string | null
          created_at: string
          default_commission_percent: number | null
          id: string
          is_owner: boolean | null
          name: string
          photo_url: string | null
          product_commission_percent: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          bio?: string | null
          color?: string | null
          created_at?: string
          default_commission_percent?: number | null
          id?: string
          is_owner?: boolean | null
          name: string
          photo_url?: string | null
          product_commission_percent?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          bio?: string | null
          color?: string | null
          created_at?: string
          default_commission_percent?: number | null
          id?: string
          is_owner?: boolean | null
          name?: string
          photo_url?: string | null
          product_commission_percent?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          reference_period_end: string | null
          reference_period_start: string | null
          staff_id: string
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          reference_period_end?: string | null
          reference_period_start?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          reference_period_end?: string | null
          reference_period_start?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          commission_percent: number | null
          service_id: string
          staff_id: string
        }
        Insert: {
          commission_percent?: number | null
          service_id: string
          staff_id: string
        }
        Update: {
          commission_percent?: number | null
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string
          id: string
          stripe_customer_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_customer_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_customer_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string
          currency: string
          id: string
          invoice_pdf: string | null
          invoice_url: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string
          tenant_id: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_pdf?: string | null
          invoice_url?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_invoice_id: string
          tenant_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_pdf?: string | null
          invoice_url?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_subscriptions: {
        Row: {
          additional_professionals: number
          billing_interval: string
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          commission_rate: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string
          status: string
          stripe_price_id: string
          stripe_subscription_id: string
          tenant_id: string
          trial_end: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          additional_professionals?: number
          billing_interval: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          commission_rate?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name: string
          status?: string
          stripe_price_id: string
          stripe_subscription_id: string
          tenant_id: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          additional_professionals?: number
          billing_interval?: string
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          commission_rate?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          status?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          tenant_id?: string
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          mp_payment_id: string | null
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subscription_id: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          mp_payment_id?: string | null
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plan_services: {
        Row: {
          id: string
          plan_id: string
          service_id: string
          sessions_per_cycle: number | null
        }
        Insert: {
          id?: string
          plan_id: string
          service_id: string
          sessions_per_cycle?: number | null
        }
        Update: {
          id?: string
          plan_id?: string
          service_id?: string
          sessions_per_cycle?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_services_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          billing_cycle: string
          created_at: string
          description: string | null
          id: string
          name: string
          photo_url: string | null
          price_cents: number
          public: boolean
          sessions_limit: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
          price_cents: number
          public?: boolean
          sessions_limit?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_cycle?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          price_cents?: number
          public?: boolean
          sessions_limit?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          booking_ids: string[] | null
          id: string
          period_end: string
          period_start: string
          service_id: string
          sessions_limit: number | null
          sessions_used: number
          subscription_id: string
        }
        Insert: {
          booking_ids?: string[] | null
          id?: string
          period_end: string
          period_start: string
          service_id: string
          sessions_limit?: number | null
          sessions_used?: number
          subscription_id: string
        }
        Update: {
          booking_ids?: string[] | null
          id?: string
          period_end?: string
          period_start?: string
          service_id?: string
          sessions_limit?: number | null
          sessions_used?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          external_subscription_id: string | null
          id: string
          plan_id: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          external_subscription_id?: string | null
          id?: string
          plan_id: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          external_subscription_id?: string | null
          id?: string
          plan_id?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          cover_url: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users_tenant: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          evolution_instance_name: string
          id: string
          last_status: string | null
          last_status_at: string | null
          tenant_id: string
          updated_at: string
          whatsapp_connected: boolean
          whatsapp_number: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          evolution_instance_name: string
          id?: string
          last_status?: string | null
          last_status_at?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_connected?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          evolution_instance_name?: string
          id?: string
          last_status?: string | null
          last_status_at?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_connected?: boolean
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_state: {
        Row: {
          created_at: string
          id: string
          last_message_id: string | null
          payload: Json | null
          remote_jid: string
          step: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_id?: string | null
          payload?: Json | null
          remote_jid: string
          step?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_id?: string | null
          payload?: Json | null
          remote_jid?: string
          step?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          created_at: string
          from_me: boolean
          id: string
          media_url: string | null
          message_id: string
          message_type: string
          remote_jid: string
          status: string | null
          tenant_id: string
          timestamp: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          message_id: string
          message_type?: string
          remote_jid: string
          status?: string | null
          tenant_id: string
          timestamp?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          message_id?: string
          message_type?: string
          remote_jid?: string
          status?: string | null
          tenant_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_booking_received_amount: {
        Row: {
          booking_id: string | null
          customer_package_id: string | null
          customer_subscription_id: string | null
          received_cents: number | null
          service_id: string | null
          staff_id: string | null
          starts_at: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_cash_summary: {
        Row: {
          closing_amount_cents: number | null
          difference_cents: number | null
          entries_count: number | null
          expected_amount_cents: number | null
          opening_amount_cents: number | null
          session_date: string | null
          session_id: string | null
          status: string | null
          tenant_id: string | null
          total_in: number | null
          total_out: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_open_balances: {
        Row: {
          balance_cents: number | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          tenant_id: string | null
          total_credits: number | null
          total_debits: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_balance_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_balance_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_revenue_received: {
        Row: {
          amount_cents: number | null
          booking_id: string | null
          payment_method: string | null
          received_date: string | null
          reference_id: string | null
          source: string | null
          staff_id: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      v_revenue_theoretical: {
        Row: {
          amount_cents: number | null
          customer_id: string | null
          customer_package_id: string | null
          customer_subscription_id: string | null
          reference_id: string | null
          revenue_date: string | null
          revenue_type: string | null
          staff_id: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_booking_with_refund: {
        Args: {
          p_booking_id: string
          p_cancellation_min_hours?: number
          p_tenant_id: string
        }
        Returns: Json
      }
      check_booking_rate_limit: {
        Args: { customer_phone: string; tenant_uuid: string }
        Returns: boolean
      }
      create_booking_if_available: {
        Args: {
          p_buffer_minutes?: number
          p_created_via?: string
          p_customer_id: string
          p_customer_package_id?: string
          p_customer_subscription_id?: string
          p_ends_at: string
          p_notes?: string
          p_service_id: string
          p_staff_id: string
          p_starts_at: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: string
      }
      get_customer_stats: {
        Args: { p_tenant_id: string }
        Returns: {
          customer_id: string
          last_visit: string
          total_bookings: number
          total_spent: number
        }[]
      }
      is_tenant_admin: { Args: { tenant_uuid: string }; Returns: boolean }
      mark_booking_no_show: {
        Args: { p_booking_id: string; p_tenant_id: string }
        Returns: Json
      }
      record_local_payment_for_booking: {
        Args: {
          p_booking_id: string
          p_cash_session_id?: string
          p_customer_id: string
          p_extra_items?: Json
          p_keep_change_as_credit?: boolean
          p_payments: Json
          p_receipt_id: string
          p_staff_id?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      user_belongs_to_tenant: {
        Args: { tenant_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
