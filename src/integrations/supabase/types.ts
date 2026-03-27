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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
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
          discount_cents: number
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
          discount_cents?: number
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
          discount_cents?: number
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
          cancellation_reason: string | null
          comanda_status: string
          created_at: string
          created_via: string | null
          customer_id: string
          customer_package_id: string | null
          customer_subscription_id: string | null
          ends_at: string
          has_conflict: boolean | null
          id: string
          notes: string | null
          reminder_sent: boolean | null
          service_id: string
          session_outcome: string | null
          staff_id: string | null
          starts_at: string
          status: string
          tenant_id: string
          tip_cents: number | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          comanda_status?: string
          created_at?: string
          created_via?: string | null
          customer_id: string
          customer_package_id?: string | null
          customer_subscription_id?: string | null
          ends_at: string
          has_conflict?: boolean | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          service_id: string
          session_outcome?: string | null
          staff_id?: string | null
          starts_at: string
          status?: string
          tenant_id: string
          tip_cents?: number | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          comanda_status?: string
          created_at?: string
          created_via?: string | null
          customer_id?: string
          customer_package_id?: string | null
          customer_subscription_id?: string | null
          ends_at?: string
          has_conflict?: boolean | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          service_id?: string
          session_outcome?: string | null
          staff_id?: string | null
          starts_at?: string
          status?: string
          tenant_id?: string
          tip_cents?: number | null
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
          expense_category_id: string | null
          id: string
          is_recurring: boolean | null
          kind: string
          notes: string | null
          occurred_at: string
          payment_id: string | null
          payment_method: string | null
          product_sale_id: string | null
          recurring_day: number | null
          session_id: string | null
          source: string | null
          staff_id: string | null
          tenant_id: string
          tip_cents: number | null
          updated_at: string | null
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string | null
          expense_category_id?: string | null
          id?: string
          is_recurring?: boolean | null
          kind: string
          notes?: string | null
          occurred_at?: string
          payment_id?: string | null
          payment_method?: string | null
          product_sale_id?: string | null
          recurring_day?: number | null
          session_id?: string | null
          source?: string | null
          staff_id?: string | null
          tenant_id: string
          tip_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string | null
          expense_category_id?: string | null
          id?: string
          is_recurring?: boolean | null
          kind?: string
          notes?: string | null
          occurred_at?: string
          payment_id?: string | null
          payment_method?: string | null
          product_sale_id?: string | null
          recurring_day?: number | null
          session_id?: string | null
          source?: string | null
          staff_id?: string | null
          tenant_id?: string
          tip_cents?: number | null
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
            foreignKeyName: "cash_entries_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_entries_product_sale_id_fkey"
            columns: ["product_sale_id"]
            isOneToOne: false
            referencedRelation: "product_sales"
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
      commission_snapshots: {
        Row: {
          base_amount_cents: number
          booking_id: string
          booking_item_id: string
          commission_cents: number
          commission_percent: number
          created_at: string
          id: string
          item_title: string
          item_type: string
          payment_source: string | null
          staff_id: string
          tenant_id: string
        }
        Insert: {
          base_amount_cents: number
          booking_id: string
          booking_item_id: string
          commission_cents: number
          commission_percent: number
          created_at?: string
          id?: string
          item_title: string
          item_type: string
          payment_source?: string | null
          staff_id: string
          tenant_id: string
        }
        Update: {
          base_amount_cents?: number
          booking_id?: string
          booking_item_id?: string
          commission_cents?: number
          commission_percent?: number
          created_at?: string
          id?: string
          item_title?: string
          item_type?: string
          payment_source?: string | null
          staff_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_snapshots_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "commission_snapshots_booking_item_id_fkey"
            columns: ["booking_item_id"]
            isOneToOne: true
            referencedRelation: "booking_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_snapshots_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_snapshots_tenant_id_fkey"
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
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          birthday: string | null
          cancellation_streak: number
          cpf: string | null
          created_at: string
          email: string | null
          forced_online_payment: boolean
          gender: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birthday?: string | null
          cancellation_streak?: number
          cpf?: string | null
          created_at?: string
          email?: string | null
          forced_online_payment?: boolean
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birthday?: string | null
          cancellation_streak?: number
          cpf?: string | null
          created_at?: string
          email?: string | null
          forced_online_payment?: boolean
          gender?: string | null
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
      expense_categories: {
        Row: {
          active: boolean
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean
          name: string
          sort_order: number | null
          tenant_id: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number | null
          tenant_id: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_cards: {
        Row: {
          completed_count: number
          created_at: string
          customer_id: string
          cycle_started_at: string
          expires_at: string | null
          id: string
          reward_pending: boolean
          stamps: number
          stamps_required: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          customer_id: string
          cycle_started_at?: string
          expires_at?: string | null
          id?: string
          reward_pending?: boolean
          stamps?: number
          stamps_required?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          customer_id?: string
          cycle_started_at?: string
          expires_at?: string | null
          id?: string
          reward_pending?: boolean
          stamps?: number
          stamps_required?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_stamps: {
        Row: {
          booking_id: string
          id: string
          loyalty_card_id: string
          stamped_at: string
          tenant_id: string
        }
        Insert: {
          booking_id: string
          id?: string
          loyalty_card_id: string
          stamped_at?: string
          tenant_id: string
        }
        Update: {
          booking_id?: string
          id?: string
          loyalty_card_id?: string
          stamped_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_stamps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_stamps_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "loyalty_stamps_loyalty_card_id_fkey"
            columns: ["loyalty_card_id"]
            isOneToOne: false
            referencedRelation: "loyalty_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_stamps_tenant_id_fkey"
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
      meta_events_log: {
        Row: {
          action_source: string
          client_ip: string | null
          client_user_agent: string | null
          created_at: string
          custom_data: Json | null
          event_id: string
          event_name: string
          event_source: string
          event_source_url: string | null
          external_id: string | null
          fbc: string | null
          fbp: string | null
          id: string
          meta_response_body: string | null
          meta_response_status: number | null
          user_email_hash: string | null
          user_phone_hash: string | null
        }
        Insert: {
          action_source?: string
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string
          custom_data?: Json | null
          event_id: string
          event_name: string
          event_source?: string
          event_source_url?: string | null
          external_id?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          meta_response_body?: string | null
          meta_response_status?: number | null
          user_email_hash?: string | null
          user_phone_hash?: string | null
        }
        Update: {
          action_source?: string
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string
          custom_data?: Json | null
          event_id?: string
          event_name?: string
          event_source?: string
          event_source_url?: string | null
          external_id?: string | null
          fbc?: string | null
          fbp?: string | null
          id?: string
          meta_response_body?: string | null
          meta_response_status?: number | null
          user_email_hash?: string | null
          user_phone_hash?: string | null
        }
        Relationships: []
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
      onboarding_progress: {
        Row: {
          biggest_challenge: string | null
          completed_at: string | null
          created_at: string
          current_booking_method: string | null
          heard_from: string | null
          id: string
          monthly_revenue: string | null
          onboarding_completed: boolean
          onboarding_skipped: boolean
          questionnaire_completed: boolean
          step_payment: boolean
          step_profile: boolean
          step_schedule: boolean
          step_services: boolean
          step_whatsapp: boolean
          team_size: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          weekly_clients: string | null
        }
        Insert: {
          biggest_challenge?: string | null
          completed_at?: string | null
          created_at?: string
          current_booking_method?: string | null
          heard_from?: string | null
          id?: string
          monthly_revenue?: string | null
          onboarding_completed?: boolean
          onboarding_skipped?: boolean
          questionnaire_completed?: boolean
          step_payment?: boolean
          step_profile?: boolean
          step_schedule?: boolean
          step_services?: boolean
          step_whatsapp?: boolean
          team_size?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          weekly_clients?: string | null
        }
        Update: {
          biggest_challenge?: string | null
          completed_at?: string | null
          created_at?: string
          current_booking_method?: string | null
          heard_from?: string | null
          id?: string
          monthly_revenue?: string | null
          onboarding_completed?: boolean
          onboarding_skipped?: boolean
          questionnaire_completed?: boolean
          step_payment?: boolean
          step_profile?: boolean
          step_schedule?: boolean
          step_services?: boolean
          step_whatsapp?: boolean
          team_size?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          weekly_clients?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          booking_id: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          customer_package_id: string | null
          discount_cents: number
          expires_at: string | null
          external_id: string | null
          forfeit_percent: number
          id: string
          payment_method: string | null
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          pix_ticket_url: string | null
          provider: string
          refund_cents: number
          refund_external_id: string | null
          refund_status: string | null
          retry_count: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_package_id?: string | null
          discount_cents?: number
          expires_at?: string | null
          external_id?: string | null
          forfeit_percent?: number
          id?: string
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          pix_ticket_url?: string | null
          provider?: string
          refund_cents?: number
          refund_external_id?: string | null
          refund_status?: string | null
          retry_count?: number
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_package_id?: string | null
          discount_cents?: number
          expires_at?: string | null
          external_id?: string | null
          forfeit_percent?: number
          id?: string
          payment_method?: string | null
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          pix_ticket_url?: string | null
          provider?: string
          refund_cents?: number
          refund_external_id?: string | null
          refund_status?: string | null
          retry_count?: number
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
      platform_fees: {
        Row: {
          commission_rate: number
          created_at: string
          fee_amount_cents: number
          id: string
          mp_payment_id: string | null
          payment_id: string | null
          status: string
          tenant_id: string
          transaction_amount_cents: number
        }
        Insert: {
          commission_rate: number
          created_at?: string
          fee_amount_cents: number
          id?: string
          mp_payment_id?: string | null
          payment_id?: string | null
          status?: string
          tenant_id: string
          transaction_amount_cents: number
        }
        Update: {
          commission_rate?: number
          created_at?: string
          fee_amount_cents?: number
          id?: string
          mp_payment_id?: string | null
          payment_id?: string | null
          status?: string
          tenant_id?: string
          transaction_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_fees_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          description: string | null
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
          description?: string | null
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
          description?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      recurring_clients: {
        Row: {
          active: boolean
          created_at: string
          customer_id: string
          duration_minutes: number
          frequency: string
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
          frequency?: string
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
          frequency?: string
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
      service_order_bumps: {
        Row: {
          active: boolean
          created_at: string
          id: string
          product_id: string
          service_id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          product_id: string
          service_id: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          product_id?: string
          service_id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_bumps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_bumps_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_bumps_tenant_id_fkey"
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
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          photo_url: string | null
          price_cents: number
          public: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          photo_url?: string | null
          price_cents?: number
          public?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          photo_url?: string | null
          price_cents?: number
          public?: boolean
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
          discount_amount_off: number | null
          discount_name: string | null
          discount_percent_off: number | null
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
          discount_amount_off?: number | null
          discount_name?: string | null
          discount_percent_off?: number | null
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
          discount_amount_off?: number | null
          discount_name?: string | null
          discount_percent_off?: number | null
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
      subscription_commission_config: {
        Row: {
          commission_mode: string
          created_at: string | null
          fixed_amount_cents: number | null
          id: string
          plan_id: string
          pool_percent: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          commission_mode?: string
          created_at?: string | null
          fixed_amount_cents?: number | null
          id?: string
          plan_id: string
          pool_percent?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          commission_mode?: string
          created_at?: string | null
          fixed_amount_cents?: number | null
          id?: string
          plan_id?: string
          pool_percent?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_commission_config_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_commission_settlement_items: {
        Row: {
          cash_entry_id: string | null
          commission_cents: number
          created_at: string | null
          id: string
          settlement_id: string
          staff_id: string
          tokens_count: number
        }
        Insert: {
          cash_entry_id?: string | null
          commission_cents?: number
          created_at?: string | null
          id?: string
          settlement_id: string
          staff_id: string
          tokens_count?: number
        }
        Update: {
          cash_entry_id?: string | null
          commission_cents?: number
          created_at?: string | null
          id?: string
          settlement_id?: string
          staff_id?: string
          tokens_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_commission_settlement_items_cash_entry_id_fkey"
            columns: ["cash_entry_id"]
            isOneToOne: false
            referencedRelation: "cash_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "subscription_commission_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_settlement_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_commission_settlements: {
        Row: {
          commission_mode: string
          created_at: string | null
          customer_subscription_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          pool_amount_cents: number
          pool_percent: number
          settled_at: string | null
          settled_by: string | null
          status: string
          subscription_amount_cents: number
          tenant_id: string
          total_tokens: number
          updated_at: string | null
        }
        Insert: {
          commission_mode: string
          created_at?: string | null
          customer_subscription_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          pool_amount_cents?: number
          pool_percent?: number
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          subscription_amount_cents: number
          tenant_id: string
          total_tokens?: number
          updated_at?: string | null
        }
        Update: {
          commission_mode?: string
          created_at?: string | null
          customer_subscription_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          pool_amount_cents?: number
          pool_percent?: number
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          subscription_amount_cents?: number
          tenant_id?: string
          total_tokens?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_commission_settlemen_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_settlements_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_commission_tokens: {
        Row: {
          booking_id: string
          booking_item_id: string
          commission_mode: string
          created_at: string | null
          customer_subscription_id: string
          fixed_amount_cents: number | null
          id: string
          period_end: string
          period_start: string
          service_id: string | null
          settled: boolean
          settlement_id: string | null
          staff_id: string
          tenant_id: string
          token_value: number
        }
        Insert: {
          booking_id: string
          booking_item_id: string
          commission_mode: string
          created_at?: string | null
          customer_subscription_id: string
          fixed_amount_cents?: number | null
          id?: string
          period_end: string
          period_start: string
          service_id?: string | null
          settled?: boolean
          settlement_id?: string | null
          staff_id: string
          tenant_id: string
          token_value?: number
        }
        Update: {
          booking_id?: string
          booking_item_id?: string
          commission_mode?: string
          created_at?: string | null
          customer_subscription_id?: string
          fixed_amount_cents?: number | null
          id?: string
          period_end?: string
          period_start?: string
          service_id?: string | null
          settled?: boolean
          settlement_id?: string | null
          staff_id?: string
          tenant_id?: string
          token_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_commission_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v_booking_received_amount"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "subscription_commission_tokens_booking_item_id_fkey"
            columns: ["booking_item_id"]
            isOneToOne: true
            referencedRelation: "booking_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_tokens_customer_subscription_id_fkey"
            columns: ["customer_subscription_id"]
            isOneToOne: false
            referencedRelation: "customer_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_tokens_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_tokens_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_commission_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
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
      subscription_plan_staff: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plan_staff_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
          attribution: Json | null
          cloudflare_hostname_id: string | null
          cloudflare_status: string | null
          cover_url: string | null
          created_at: string
          custom_domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          meta_fbc: string | null
          meta_fbp: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          attribution?: Json | null
          cloudflare_hostname_id?: string | null
          cloudflare_status?: string | null
          cover_url?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          attribution?: Json | null
          cloudflare_hostname_id?: string | null
          cloudflare_status?: string | null
          cover_url?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          meta_fbc?: string | null
          meta_fbp?: string | null
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
      visitor_sessions: {
        Row: {
          created_at: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          gclid: string | null
          id: string
          ip_address: string | null
          landing_page: string | null
          referrer: string | null
          tenant_id: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          referrer?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          landing_page?: string | null
          referrer?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_sessions_tenant_id_fkey"
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
      commission_details: {
        Row: {
          base_amount_cents: number | null
          booking_date: string | null
          booking_id: string | null
          booking_item_id: string | null
          commission_cents: number | null
          commission_percent: number | null
          commission_type: string | null
          created_at: string | null
          customer_name: string | null
          id: string | null
          item_title: string | null
          item_type: string | null
          payment_source: string | null
          staff_id: string | null
          staff_name: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      staff_calendar_bookings: {
        Row: {
          booking_id: string | null
          calendar_staff_id: string | null
          comanda_status: string | null
          created_at: string | null
          created_via: string | null
          customer_id: string | null
          customer_package_id: string | null
          customer_subscription_id: string | null
          ends_at: string | null
          has_conflict: boolean | null
          notes: string | null
          reminder_sent: boolean | null
          service_id: string | null
          staff_role: string | null
          starts_at: string | null
          status: string | null
          tenant_id: string | null
          tip_cents: number | null
          updated_at: string | null
        }
        Relationships: []
      }
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
      admin_get_attribution_report: { Args: never; Returns: Json }
      admin_get_dashboard_stats: { Args: never; Returns: Json }
      admin_get_onboarding_funnel: { Args: never; Returns: Json }
      admin_get_platform_analytics: { Args: never; Returns: Json }
      admin_get_saas_kpis: { Args: never; Returns: Json }
      admin_get_tenant_detail: { Args: { p_tenant_id: string }; Returns: Json }
      admin_get_tenant_timeline: {
        Args: { p_limit?: number; p_tenant_id: string }
        Returns: Json
      }
      admin_list_invoices: {
        Args: { p_limit?: number; p_status?: string }
        Returns: Json
      }
      admin_list_platform_fees: { Args: { p_limit?: number }; Returns: Json }
      admin_list_tenants: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_update_tenant: {
        Args: { p_tenant_id: string; p_updates: Json }
        Returns: Json
      }
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
      check_ip_rate_limit: {
        Args: { p_endpoint: string; p_ip: string; p_tenant_id?: string }
        Returns: boolean
      }
      check_service_coverage: {
        Args: {
          p_customer_id: string
          p_service_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      close_comanda_with_commissions:
        | {
            Args: {
              p_booking_id: string
              p_commission_basis?: string
              p_tenant_id: string
              p_tip_cents?: number
              p_tip_payment_method?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_booking_id: string
              p_commission_basis?: string
              p_tenant_id: string
            }
            Returns: Json
          }
      conclude_unified_bookings: {
        Args: {
          p_booking_ids: string[]
          p_discount_cents?: number
          p_notes?: string
          p_payment_method: string
        }
        Returns: Json
      }
      create_booking_if_available:
        | {
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
        | {
            Args: {
              p_buffer_minutes?: number
              p_created_via?: string
              p_customer_id: string
              p_customer_package_id?: string
              p_customer_subscription_id?: string
              p_ends_at: string
              p_notes?: string
              p_service_id: string
              p_skip_conflict_check?: boolean
              p_staff_id: string
              p_starts_at: string
              p_status: string
              p_tenant_id: string
            }
            Returns: string
          }
      generate_subscription_commission_tokens: {
        Args: { p_booking_id: string; p_tenant_id: string }
        Returns: Json
      }
      get_booking_total: { Args: { p_booking_id: string }; Returns: Json }
      get_customer_covered_services: {
        Args: { p_customer_id: string; p_tenant_id: string }
        Returns: {
          service_id: string
          service_name: string
          sessions_remaining: number
          source: string
          source_name: string
        }[]
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
      get_loyalty_status: {
        Args: { p_customer_phone: string; p_tenant_id: string }
        Returns: {
          completed_count: number
          expires_at: string
          has_loyalty: boolean
          reward_pending: boolean
          stamps: number
          stamps_required: number
        }[]
      }
      get_payment_status: {
        Args: { p_payment_id: string }
        Returns: {
          amount_cents: number
          booking_id: string
          discount_cents: number
          forfeit_percent: number
          id: string
          payment_method: string
          pix_expires_at: string
          pix_qr_code: string
          pix_qr_code_base64: string
          pix_ticket_url: string
          refund_cents: number
          refund_status: string
          status: string
        }[]
      }
      get_related_bookings: {
        Args: { p_booking_id: string }
        Returns: {
          ends_at: string
          id: string
          items: Json
          service_name: string
          service_price_cents: number
          staff_id: string
          staff_name: string
          starts_at: string
          status: string
        }[]
      }
      get_staff_bookings: {
        Args: {
          p_date_end: string
          p_date_start: string
          p_staff_id: string
          p_tenant_id: string
        }
        Returns: {
          all_items: Json
          booking_id: string
          comanda_status: string
          customer_name: string
          customer_phone: string
          ends_at: string
          has_conflict: boolean
          main_staff_name: string
          my_duration_minutes: number
          notes: string
          service_color: string
          service_duration: number
          service_name: string
          service_price_cents: number
          staff_role: string
          starts_at: string
          status: string
        }[]
      }
      get_subscription_commission_summary: {
        Args: {
          p_period_end?: string
          p_period_start?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      import_customers_batch: {
        Args: { p_customers: Json; p_tenant_id: string }
        Returns: Json
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { tenant_uuid: string }; Returns: boolean }
      link_visitor_attribution: {
        Args: { p_tenant_id: string; p_visitor_id: string }
        Returns: Json
      }
      mark_booking_no_show: {
        Args: {
          p_booking_id: string
          p_forfeit_override?: number
          p_tenant_id: string
        }
        Returns: Json
      }
      merge_customers: {
        Args: { p_keep_id: string; p_remove_id: string; p_tenant_id: string }
        Returns: Json
      }
      record_local_payment_for_booking: {
        Args: {
          p_booking_id: string
          p_cash_session_id: string
          p_customer_id: string
          p_extra_items: Json
          p_keep_change_as_credit: boolean
          p_payments: Json
          p_receipt_id: string
          p_staff_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      record_visitor_session: {
        Args: {
          p_fbc?: string
          p_fbclid?: string
          p_fbp?: string
          p_gclid?: string
          p_ip_address?: string
          p_landing_page?: string
          p_referrer?: string
          p_user_agent?: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
          p_visitor_id: string
        }
        Returns: string
      }
      redeem_loyalty_reward: {
        Args: {
          p_booking_id?: string
          p_customer_id: string
          p_tenant_id: string
        }
        Returns: Json
      }
      reopen_booking: { Args: { p_booking_id: string }; Returns: Json }
      reopen_comanda: {
        Args: { p_booking_id: string; p_tenant_id: string }
        Returns: Json
      }
      save_onboarding_questionnaire: {
        Args: {
          p_biggest_challenge: string
          p_current_booking_method: string
          p_heard_from: string
          p_monthly_revenue: string
          p_team_size: string
          p_weekly_clients: string
        }
        Returns: Json
      }
      search_customers: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_tenant_id: string
        }
        Returns: {
          birthday: string
          booking_count: number
          cpf: string
          created_at: string
          email: string
          gender: string
          id: string
          last_booking: string
          name: string
          notes: string
          phone: string
        }[]
      }
      search_customers_quick: {
        Args: { p_limit?: number; p_query: string; p_tenant_id: string }
        Returns: {
          id: string
          name: string
          phone: string
        }[]
      }
      seed_default_expense_categories: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      settle_all_subscription_commissions: {
        Args: {
          p_cash_session_id?: string
          p_settled_by?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      settle_subscription_commission: {
        Args: {
          p_cash_session_id?: string
          p_customer_subscription_id: string
          p_period_end: string
          p_period_start: string
          p_settled_by?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      skip_onboarding: { Args: never; Returns: Json }
      update_onboarding_step: {
        Args: { p_step: string; p_value?: boolean }
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
