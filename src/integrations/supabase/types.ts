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
      attempts: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_option: number | null
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_option?: number | null
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option?: number | null
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          question_id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          question_id: string
          subject_id: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          question_id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          sub_subject_id: string | null
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          sub_subject_id?: string | null
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          sub_subject_id?: string | null
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_sub_subject_id_fkey"
            columns: ["sub_subject_id"]
            isOneToOne: false
            referencedRelation: "sub_subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mistakes: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          last_wrong_at: string
          question_id: string
          subject_id: string
          updated_at: string
          user_id: string
          wrong_count: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          last_wrong_at?: string
          question_id: string
          subject_id: string
          updated_at?: string
          user_id: string
          wrong_count?: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          last_wrong_at?: string
          question_id?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
          wrong_count?: number
        }
        Relationships: []
      }
      mock_test_questions: {
        Row: {
          position: number
          question_id: string
          template_id: string
        }
        Insert: {
          position?: number
          question_id: string
          template_id: string
        }
        Update: {
          position?: number
          question_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_test_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mock_test_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          subject_id: string | null
          time_limit_seconds: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          subject_id?: string | null
          time_limit_seconds?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          subject_id?: string | null
          time_limit_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_test_templates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          accuracy: number
          created_at: string
          id: string
          percentage: number
          score: number
          subject_id: string | null
          taken_at: string
          test_name: string
          time_taken_seconds: number
          total_questions: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          created_at?: string
          id?: string
          percentage?: number
          score: number
          subject_id?: string | null
          taken_at?: string
          test_name: string
          time_taken_seconds?: number
          total_questions: number
          user_id: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          id?: string
          percentage?: number
          score?: number
          subject_id?: string | null
          taken_at?: string
          test_name?: string
          time_taken_seconds?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string | null
          download_count: number
          id: string
          is_premium: boolean
          is_published: boolean
          pdf_url: string
          resource_type: Database["public"]["Enums"]["resource_type"]
          subject_id: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          year: number | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          is_premium?: boolean
          is_published?: boolean
          pdf_url: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          subject_id?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          is_premium?: boolean
          is_published?: boolean
          pdf_url?: string
          resource_type?: Database["public"]["Enums"]["resource_type"]
          subject_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_for: string | null
          sent_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          last_practiced_at: string
          last_question_index: number
          subject_id: string
          total_time_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          last_practiced_at?: string
          last_question_index?: number
          subject_id: string
          total_time_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          last_practiced_at?: string
          last_question_index?: number
          subject_id?: string
          total_time_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          exam_year: number | null
          id: string
          is_premium: boolean
          premium_expires_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_year?: number | null
          id: string
          is_premium?: boolean
          premium_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          exam_year?: number | null
          id?: string
          is_premium?: boolean
          premium_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter_id: string
          correct_answer: number
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          explanation: string | null
          id: string
          is_pyq: boolean
          language: string | null
          legacy_id: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          status: Database["public"]["Enums"]["question_status"]
          subject_id: string
          tags: string[]
          text: string
          updated_at: string
          year: number | null
        }
        Insert: {
          chapter_id: string
          correct_answer: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          explanation?: string | null
          id?: string
          is_pyq?: boolean
          language?: string | null
          legacy_id?: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          status?: Database["public"]["Enums"]["question_status"]
          subject_id: string
          tags?: string[]
          text: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          chapter_id?: string
          correct_answer?: number
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          explanation?: string | null
          id?: string
          is_pyq?: boolean
          language?: string | null
          legacy_id?: string | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          status?: Database["public"]["Enums"]["question_status"]
          subject_id?: string
          tags?: string[]
          text?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_subjects: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          glyph: string
          hue: string
          id: string
          is_active: boolean
          name: string
          short: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          glyph?: string
          hue?: string
          id?: string
          is_active?: boolean
          name: string
          short: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          glyph?: string
          hue?: string
          id?: string
          is_active?: boolean
          name?: string
          short?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      question_difficulty: "easy" | "medium" | "hard"
      question_status: "draft" | "published"
      resource_type: "pyq_paper" | "formula_sheet" | "premium_note"
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
      app_role: ["admin", "moderator", "user"],
      question_difficulty: ["easy", "medium", "hard"],
      question_status: ["draft", "published"],
      resource_type: ["pyq_paper", "formula_sheet", "premium_note"],
    },
  },
} as const
