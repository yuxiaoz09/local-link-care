export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string
          description: string | null
          employee_id: string | null
          end_time: string
          id: string
          location_id: string | null
          price: number | null
          service_id: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          location_id?: string | null
          price?: number | null
          service_id?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          location_id?: string | null
          price?: number | null
          service_id?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_metrics: {
        Row: {
          business_id: string
          completed_appointments: number | null
          created_at: string | null
          id: string
          metric_date: string
          new_customers: number | null
          total_appointments: number | null
          total_customers: number | null
          total_revenue: number | null
        }
        Insert: {
          business_id: string
          completed_appointments?: number | null
          created_at?: string | null
          id?: string
          metric_date: string
          new_customers?: number | null
          total_appointments?: number | null
          total_customers?: number | null
          total_revenue?: number | null
        }
        Update: {
          business_id?: string
          completed_appointments?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          new_customers?: number | null
          total_appointments?: number | null
          total_customers?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          owner_email: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_email: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_email?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          parsed_intent: string | null
          response_data: Json | null
          updated_at: string | null
          user_query: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          parsed_intent?: string | null
          response_data?: Json | null
          updated_at?: string | null
          user_query: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          parsed_intent?: string | null
          response_data?: Json | null
          updated_at?: string | null
          user_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tag_assignments: {
        Row: {
          assigned_at: string
          customer_id: string
          id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          customer_id: string
          id?: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          customer_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          business_id: string
          category: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          preferred_location_id: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          preferred_location_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          preferred_location_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          business_id: string
          commission_rate: number | null
          created_at: string | null
          email: string | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          commission_rate?: number | null
          created_at?: string | null
          email?: string | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string | null
          current_stock: number | null
          id: string
          last_restocked: string | null
          location_id: string
          maximum_stock: number | null
          minimum_stock: number | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_restocked?: string | null
          location_id: string
          maximum_stock?: number | null
          minimum_stock?: number | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          id?: string
          last_restocked?: string | null
          location_id?: string
          maximum_stock?: number | null
          minimum_stock?: number | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          operating_hours: Json | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          employee_id: string | null
          id: string
          location_id: string | null
          product_id: string
          quantity: number
          sale_date: string | null
          sale_price: number
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          employee_id?: string | null
          id?: string
          location_id?: string | null
          product_id: string
          quantity: number
          sale_date?: string | null
          sale_price: number
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          employee_id?: string | null
          id?: string
          location_id?: string | null
          product_id?: string
          quantity?: number
          sale_date?: string | null
          sale_price?: number
          total_amount?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          business_id: string
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          retail_price: number | null
          sku: string | null
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          retail_price?: number | null
          sku?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          retail_price?: number | null
          sku?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      query_analytics: {
        Row: {
          avg_response_time: number | null
          business_id: string
          created_at: string | null
          id: string
          last_used: string | null
          query_type: string
          success_rate: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          avg_response_time?: number | null
          business_id: string
          created_at?: string | null
          id?: string
          last_used?: string | null
          query_type: string
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          avg_response_time?: number | null
          business_id?: string
          created_at?: string | null
          id?: string
          last_used?: string | null
          query_type?: string
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "query_analytics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number | null
          business_id: string
          cost_per_service: number | null
          created_at: string | null
          estimated_duration: number | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          business_id: string
          cost_per_service?: number | null
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          business_id?: string
          cost_per_service?: number | null
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          business_id: string
          completed: boolean | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          location_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          completed?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          completed?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          location_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customer_analytics: {
        Row: {
          address: string | null
          avg_order_value: number | null
          business_id: string | null
          created_at: string | null
          customer_lifetime_value: number | null
          days_since_last_visit: number | null
          email: string | null
          frequency_score: number | null
          id: string | null
          monetary_score: number | null
          name: string | null
          notes: string | null
          phone: string | null
          recency_score: number | null
          tags: string[] | null
          total_appointments: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_analytics: {
        Row: {
          avg_transaction_value: number | null
          business_id: string | null
          month: string | null
          total_appointments: number | null
          total_revenue: number | null
          unique_customers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_appointments_period: {
        Args: { business_uuid: string; start_date: string; end_date: string }
        Returns: {
          appointment_id: string
          customer_name: string
          appointment_title: string
          start_time: string
          end_time: string
          status: string
          price: number
        }[]
      }
      get_at_risk_customers: {
        Args: { business_uuid: string; days_threshold?: number }
        Returns: {
          customer_id: string
          customer_name: string
          customer_email: string
          customer_phone: string
          days_since_last_visit: number
          total_spent: number
          last_visit_date: string
        }[]
      }
      get_best_customer_period: {
        Args: { business_uuid: string; start_date: string; end_date: string }
        Returns: {
          customer_id: string
          customer_name: string
          customer_email: string
          customer_phone: string
          total_spent: number
          appointment_count: number
          last_visit: string
        }[]
      }
      get_business_tags_with_usage: {
        Args: { p_business_id: string }
        Returns: {
          tag_id: string
          tag_name: string
          tag_color: string
          tag_category: string
          usage_count: number
        }[]
      }
      get_customer_segment: {
        Args: { r_score: number; f_score: number; m_score: number }
        Returns: string
      }
      get_customer_tags_with_assignments: {
        Args: { p_customer_id: string }
        Returns: {
          tag_id: string
          tag_name: string
          tag_color: string
          tag_category: string
        }[]
      }
      get_revenue_period: {
        Args: { business_uuid: string; start_date: string; end_date: string }
        Returns: {
          total_revenue: number
          appointment_count: number
          avg_transaction_value: number
          unique_customers: number
        }[]
      }
      log_analytics_access: {
        Args: { p_action: string; p_resource: string; p_details?: Json }
        Returns: undefined
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
