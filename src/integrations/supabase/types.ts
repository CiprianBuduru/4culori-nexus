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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      authorized_employees: {
        Row: {
          created_at: string | null
          departments: string[] | null
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          departments?: string[] | null
          email: string
          id?: string
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          departments?: string[] | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          contact_method: string | null
          contact_person: string | null
          contract_company: string | null
          contract_number: string | null
          contract_url: string | null
          created_at: string
          cui: string | null
          email: string | null
          id: string
          is_comercial: boolean | null
          is_unitate_protejata: boolean | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          contact_method?: string | null
          contact_person?: string | null
          contract_company?: string | null
          contract_number?: string | null
          contract_url?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          id?: string
          is_comercial?: boolean | null
          is_unitate_protejata?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          contact_method?: string | null
          contact_person?: string | null
          contract_company?: string | null
          contract_number?: string | null
          contract_url?: string | null
          created_at?: string
          cui?: string | null
          email?: string | null
          id?: string
          is_comercial?: boolean | null
          is_unitate_protejata?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          sub_departments: Json | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sub_departments?: Json | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sub_departments?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          access_level: number | null
          avatar: string | null
          birth_date: string | null
          company: string | null
          created_at: string
          department_id: string
          email: string
          hire_date: string | null
          id: string
          is_protected_unit: boolean | null
          name: string
          phone: string | null
          position: string
          salary_gross: number | null
          salary_net: number | null
          service_ids: string[] | null
          status: string
          updated_at: string
          vacation_days_per_year: number | null
        }
        Insert: {
          access_level?: number | null
          avatar?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string
          department_id: string
          email: string
          hire_date?: string | null
          id?: string
          is_protected_unit?: boolean | null
          name: string
          phone?: string | null
          position: string
          salary_gross?: number | null
          salary_net?: number | null
          service_ids?: string[] | null
          status?: string
          updated_at?: string
          vacation_days_per_year?: number | null
        }
        Update: {
          access_level?: number | null
          avatar?: string | null
          birth_date?: string | null
          company?: string | null
          created_at?: string
          department_id?: string
          email?: string
          hire_date?: string | null
          id?: string
          is_protected_unit?: boolean | null
          name?: string
          phone?: string | null
          position?: string
          salary_gross?: number | null
          salary_net?: number | null
          service_ids?: string[] | null
          status?: string
          updated_at?: string
          vacation_days_per_year?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_task_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_task_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_task_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_task_id_fkey"
            columns: ["related_task_id"]
            isOneToOne: false
            referencedRelation: "production_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          attachment_url: string | null
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          needs_dtp: boolean | null
          notes: string | null
          order_number: string
          production_days: number | null
          production_operations: string[] | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          needs_dtp?: boolean | null
          notes?: string | null
          order_number: string
          production_days?: number | null
          production_operations?: string[] | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          needs_dtp?: boolean | null
          notes?: string | null
          order_number?: string
          production_days?: number | null
          production_operations?: string[] | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          assigned_to: string | null
          client_name: string | null
          created_at: string
          department_id: string
          description: string | null
          end_date: string
          id: string
          notes: string | null
          operation_name: string | null
          order_id: string | null
          priority: string
          quantity: number | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_name?: string | null
          created_at?: string
          department_id: string
          description?: string | null
          end_date: string
          id?: string
          notes?: string | null
          operation_name?: string | null
          order_id?: string | null
          priority?: string
          quantity?: number | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_name?: string | null
          created_at?: string
          department_id?: string
          description?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          operation_name?: string | null
          order_id?: string | null
          priority?: string
          quantity?: number | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          departments: string[] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          departments?: string[] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          departments?: string[] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacations: {
        Row: {
          created_at: string
          employee_id: string
          employee_name: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employee_name: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employee_name?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_departments: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrator"
        | "director"
        | "sef_productie"
        | "operator"
        | "vizitator"
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
      app_role: [
        "administrator",
        "director",
        "sef_productie",
        "operator",
        "vizitator",
      ],
    },
  },
} as const
