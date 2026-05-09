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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability_periods: {
        Row: {
          end_date: string
          id: string
          name: string
          start_date: string
        }
        Insert: {
          end_date: string
          id?: string
          name: string
          start_date: string
        }
        Update: {
          end_date?: string
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      availability_windows: {
        Row: {
          end_time: string
          id: string
          period_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          period_id: string
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          period_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_windows_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "availability_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      blackouts: {
        Row: {
          end_date: string
          id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
        }
        Update: {
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: []
      }
      families: {
        Row: {
          created_at: string
          id: string
          parent_email: string
          parent_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_email: string
          parent_name: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_email?: string
          parent_name?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          late_cancel: boolean
          note: string | null
          parent_lesson_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["lesson_status"]
          student_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          late_cancel?: boolean
          note?: string | null
          parent_lesson_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["lesson_status"]
          student_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          late_cancel?: boolean
          note?: string | null
          parent_lesson_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_parent_lesson_id_fkey"
            columns: ["parent_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      period_exceptions: {
        Row: {
          block_end: string | null
          block_start: string | null
          exception_date: string
          id: string
          period_id: string
          reason: string | null
        }
        Insert: {
          block_end?: string | null
          block_start?: string | null
          exception_date: string
          id?: string
          period_id: string
          reason?: string | null
        }
        Update: {
          block_end?: string | null
          block_start?: string | null
          exception_date?: string
          id?: string
          period_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_exceptions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "availability_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_assignments: {
        Row: {
          active_from: string
          active_until: string | null
          duration_minutes: number
          id: string
          start_time: string
          student_id: string
          weekday: number
        }
        Insert: {
          active_from: string
          active_until?: string | null
          duration_minutes?: number
          id?: string
          start_time: string
          student_id: string
          weekday: number
        }
        Update: {
          active_from?: string
          active_until?: string | null
          duration_minutes?: number
          id?: string
          start_time?: string
          student_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurring_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean
          family_id: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          family_id: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          family_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_settings: {
        Row: {
          ical_token: string
          id: number
          teacher_uid: string | null
        }
        Insert: {
          ical_token?: string
          id?: number
          teacher_uid?: string | null
        }
        Update: {
          ical_token?: string
          id?: number
          teacher_uid?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_teacher: { Args: never; Returns: boolean }
      my_family_id: { Args: never; Returns: string }
    }
    Enums: {
      lesson_status: "scheduled" | "cancelled" | "rescheduled" | "completed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      lesson_status: ["scheduled", "cancelled", "rescheduled", "completed"],
    },
  },
} as const
