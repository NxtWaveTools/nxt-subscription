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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          short_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          short_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          short_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      hod_departments: {
        Row: {
          created_at: string
          department_id: string
          hod_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          hod_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          hod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_departments_hod_id_fkey"
            columns: ["hod_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hod_poc_mapping: {
        Row: {
          created_at: string
          hod_id: string
          poc_id: string
        }
        Insert: {
          created_at?: string
          hod_id: string
          poc_id: string
        }
        Update: {
          created_at?: string
          hod_id?: string
          poc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hod_poc_mapping_hod_id_fkey"
            columns: ["hod_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hod_poc_mapping_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      poc_department_access: {
        Row: {
          created_at: string
          department_id: string
          poc_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          poc_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          poc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poc_department_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poc_department_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poc_department_access_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_approvals: {
        Row: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id: string
          comments: string | null
          created_at: string
          id: string
          subscription_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action"]
          approver_id: string
          comments?: string | null
          created_at?: string
          id?: string
          subscription_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action"]
          approver_id?: string
          comments?: string | null
          created_at?: string
          id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_approvals_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          mime_type: string
          original_filename: string | null
          storage_path: string | null
          subscription_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          id?: string
          mime_type: string
          original_filename?: string | null
          storage_path?: string | null
          subscription_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          mime_type?: string
          original_filename?: string | null
          storage_path?: string | null
          subscription_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_files_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          accounting_status: string
          created_at: string
          cycle_end_date: string
          cycle_number: number
          cycle_start_date: string
          cycle_status: Database["public"]["Enums"]["payment_cycle_status"]
          id: string
          invoice_deadline: string
          invoice_file_id: string | null
          invoice_uploaded_at: string | null
          mandate_id: string | null
          payment_recorded_at: string | null
          payment_recorded_by: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_utr: string | null
          poc_approval_status: string
          poc_approved_at: string | null
          poc_approved_by: string | null
          poc_rejection_reason: string | null
          subscription_id: string
          updated_at: string
        }
        Insert: {
          accounting_status?: string
          created_at?: string
          cycle_end_date: string
          cycle_number?: number
          cycle_start_date: string
          cycle_status?: Database["public"]["Enums"]["payment_cycle_status"]
          id?: string
          invoice_deadline: string
          invoice_file_id?: string | null
          invoice_uploaded_at?: string | null
          mandate_id?: string | null
          payment_recorded_at?: string | null
          payment_recorded_by?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_utr?: string | null
          poc_approval_status?: string
          poc_approved_at?: string | null
          poc_approved_by?: string | null
          poc_rejection_reason?: string | null
          subscription_id: string
          updated_at?: string
        }
        Update: {
          accounting_status?: string
          created_at?: string
          cycle_end_date?: string
          cycle_number?: number
          cycle_start_date?: string
          cycle_status?: Database["public"]["Enums"]["payment_cycle_status"]
          id?: string
          invoice_deadline?: string
          invoice_file_id?: string | null
          invoice_uploaded_at?: string | null
          mandate_id?: string | null
          payment_recorded_at?: string | null
          payment_recorded_by?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_utr?: string | null
          poc_approval_status?: string
          poc_approved_at?: string | null
          poc_approved_by?: string | null
          poc_rejection_reason?: string | null
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_invoice_file_id_fkey"
            columns: ["invoice_file_id"]
            isOneToOne: false
            referencedRelation: "subscription_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_payment_recorded_by_fkey"
            columns: ["payment_recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_poc_approved_by_fkey"
            columns: ["poc_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_sequences: {
        Row: {
          created_at: string
          department_id: string
          fiscal_year: number
          id: string
          last_sequence_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          fiscal_year: number
          id?: string
          last_sequence_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          fiscal_year?: number
          id?: string
          last_sequence_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_sequences_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_sequences_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          accounting_status: string
          amount: number
          billing_frequency: Database["public"]["Enums"]["billing_frequency"]
          budget_period: string | null
          created_at: string
          created_by: string
          currency: string
          department_id: string
          end_date: string | null
          equivalent_inr_amount: number | null
          id: string
          location_id: string | null
          login_url: string | null
          mandate_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_utr: string | null
          poc_email: string | null
          product_id: string | null
          request_type: string
          requester_remarks: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_email: string | null
          subscription_id: string
          tool_name: string
          updated_at: string
          vendor_name: string
          version: number
        }
        Insert: {
          accounting_status?: string
          amount: number
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          budget_period?: string | null
          created_at?: string
          created_by: string
          currency?: string
          department_id: string
          end_date?: string | null
          equivalent_inr_amount?: number | null
          id?: string
          location_id?: string | null
          login_url?: string | null
          mandate_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_utr?: string | null
          poc_email?: string | null
          product_id?: string | null
          request_type?: string
          requester_remarks?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_email?: string | null
          subscription_id: string
          tool_name: string
          updated_at?: string
          vendor_name: string
          version?: number
        }
        Update: {
          accounting_status?: string
          amount?: number
          billing_frequency?: Database["public"]["Enums"]["billing_frequency"]
          budget_period?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          department_id?: string
          end_date?: string | null
          equivalent_inr_amount?: number | null
          id?: string
          location_id?: string | null
          login_url?: string | null
          mandate_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_utr?: string | null
          poc_email?: string | null
          product_id?: string | null
          request_type?: string
          requester_remarks?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_email?: string | null
          subscription_id?: string
          tool_name?: string
          updated_at?: string
          vendor_name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "department_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      department_analytics: {
        Row: {
          active_user_count: number | null
          created_at: string | null
          hod_count: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          poc_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_audit_log: {
        Args: {
          p_action: string
          p_changes?: Json
          p_entity_id?: string
          p_entity_type: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_short_code: { Args: { dept_name: string }; Returns: string }
      generate_subscription_code: {
        Args: { p_department_id: string }
        Returns: string
      }
      get_department_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users: number
          department_id: string
          department_name: string
          hod_count: number
          poc_count: number
          total_users: number
        }[]
      }
      get_role_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          role_name: string
          user_count: number
        }[]
      }
      get_user_activity_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_percentage: number
          active_users: number
          inactive_users: number
          total_users: number
        }[]
      }
      get_user_role_name: { Args: { user_uuid: string }; Returns: string }
      has_any_role: { Args: { role_names: string[] }; Returns: boolean }
      has_poc_access_to_department: {
        Args: { dept_id: string }
        Returns: boolean
      }
      has_role: { Args: { role_name: string }; Returns: boolean }
      is_hod_of_department: { Args: { dept_id: string }; Returns: boolean }
    }
    Enums: {
      approval_action: "APPROVED" | "REJECTED"
      billing_frequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | "USAGE_BASED"
      payment_cycle_status:
        | "PENDING_PAYMENT"
        | "PAYMENT_RECORDED"
        | "PENDING_APPROVAL"
        | "APPROVED"
        | "REJECTED"
        | "INVOICE_UPLOADED"
        | "COMPLETED"
        | "CANCELLED"
      payment_status: "PAID" | "IN_PROGRESS" | "DECLINED"
      subscription_status:
        | "PENDING"
        | "ACTIVE"
        | "REJECTED"
        | "EXPIRED"
        | "CANCELLED"
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
      approval_action: ["APPROVED", "REJECTED"],
      billing_frequency: ["MONTHLY", "QUARTERLY", "YEARLY", "USAGE_BASED"],
      payment_cycle_status: [
        "PENDING_PAYMENT",
        "PAYMENT_RECORDED",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "INVOICE_UPLOADED",
        "COMPLETED",
        "CANCELLED",
      ],
      payment_status: ["PAID", "IN_PROGRESS", "DECLINED"],
      subscription_status: [
        "PENDING",
        "ACTIVE",
        "REJECTED",
        "EXPIRED",
        "CANCELLED",
      ],
    },
  },
} as const
