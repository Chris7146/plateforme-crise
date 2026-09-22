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
      answer_drafts: {
        Row: {
          content: Json
          question_id: string
          team_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: Json
          question_id: string
          team_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          question_id?: string
          team_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_drafts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          content: Json
          id: string
          question_id: string
          step_index: number
          submitted_at: string
          submitted_by: string | null
          team_id: string
        }
        Insert: {
          content: Json
          id?: string
          question_id: string
          step_index: number
          submitted_at?: string
          submitted_by?: string | null
          team_id: string
        }
        Update: {
          content?: Json
          id?: string
          question_id?: string
          step_index?: number
          submitted_at?: string
          submitted_by?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      contents: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_modified: boolean
          media_path: string | null
          position: number
          source_id: string | null
          step_id: string
          title: string
          trigger_mode: Database["public"]["Enums"]["trigger_mode"]
          trigger_offset_seconds: number
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_modified?: boolean
          media_path?: string | null
          position?: number
          source_id?: string | null
          step_id: string
          title: string
          trigger_mode?: Database["public"]["Enums"]["trigger_mode"]
          trigger_offset_seconds?: number
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_modified?: boolean
          media_path?: string | null
          position?: number
          source_id?: string | null
          step_id?: string
          title?: string
          trigger_mode?: Database["public"]["Enums"]["trigger_mode"]
          trigger_offset_seconds?: number
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          created_at: string
          id: number
          payload: Json
          session_id: string
          team_id: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind: string
          created_at?: string
          id?: never
          payload?: Json
          session_id: string
          team_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          id?: never
          payload?: Json
          session_id?: string
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["exercise_kind"]
          max_content_score: number
          max_time_bonus: number
          source_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["exercise_kind"]
          max_content_score?: number
          max_time_bonus?: number
          source_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["exercise_kind"]
          max_content_score?: number
          max_time_bonus?: number
          source_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      hints: {
        Row: {
          body: string
          created_at: string
          id: string
          is_modified: boolean
          position: number
          source_id: string | null
          step_id: string
          trigger_mode: Database["public"]["Enums"]["trigger_mode"]
          trigger_offset_seconds: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_modified?: boolean
          position?: number
          source_id?: string | null
          step_id: string
          trigger_mode?: Database["public"]["Enums"]["trigger_mode"]
          trigger_offset_seconds?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_modified?: boolean
          position?: number
          source_id?: string | null
          step_id?: string
          trigger_mode?: Database["public"]["Enums"]["trigger_mode"]
          trigger_offset_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hints_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "hints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hints_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          from_staff: boolean
          id: string
          read_at: string | null
          session_id: string
          team_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          from_staff: boolean
          id?: string
          read_at?: string | null
          session_id: string
          team_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          from_staff?: boolean
          id?: string
          read_at?: string | null
          session_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          session_id: string
          step_index: number | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          session_id: string
          step_index?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          session_id?: string
          step_index?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          accepted_terms_at: string
          display_name: string
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          accepted_terms_at: string
          display_name: string
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          accepted_terms_at?: string
          display_name?: string
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          expected_answer: Json | null
          id: string
          is_modified: boolean
          mandatory: boolean
          options: Json
          position: number
          prompt: string
          scoring_guide: string | null
          source_id: string | null
          step_id: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_answer?: Json | null
          id?: string
          is_modified?: boolean
          mandatory?: boolean
          options?: Json
          position?: number
          prompt: string
          scoring_guide?: string | null
          source_id?: string | null
          step_id: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_answer?: Json | null
          id?: string
          is_modified?: boolean
          mandatory?: boolean
          options?: Json
          position?: number
          prompt?: string
          scoring_guide?: string | null
          source_id?: string | null
          step_id?: string
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          content_score: number | null
          scored_by: string | null
          step_index: number
          team_id: string
          time_bonus: number | null
          updated_at: string
        }
        Insert: {
          content_score?: number | null
          scored_by?: string | null
          step_index: number
          team_id: string
          time_bonus?: number | null
          updated_at?: string
        }
        Update: {
          content_score?: number | null
          scored_by?: string | null
          step_index?: number
          team_id?: string
          time_bonus?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          exercise_id: string
          id: string
          paused_at: string | null
          snapshot: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          exercise_id: string
          id?: string
          paused_at?: string | null
          snapshot?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          exercise_id?: string
          id?: string
          paused_at?: string | null
          snapshot?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          display_name: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      steps: {
        Row: {
          advance_on_submit: boolean
          ambient_audio_path: string | null
          created_at: string
          duration_seconds: number
          end_of_time: Database["public"]["Enums"]["end_of_time"]
          exercise_id: string
          id: string
          is_modified: boolean
          position: number
          source_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          advance_on_submit?: boolean
          ambient_audio_path?: string | null
          created_at?: string
          duration_seconds: number
          end_of_time?: Database["public"]["Enums"]["end_of_time"]
          exercise_id: string
          id?: string
          is_modified?: boolean
          position?: number
          source_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advance_on_submit?: boolean
          ambient_audio_path?: string | null
          created_at?: string
          duration_seconds?: number
          end_of_time?: Database["public"]["Enums"]["end_of_time"]
          exercise_id?: string
          id?: string
          is_modified?: boolean
          position?: number
          source_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "steps_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          current_step: number
          id: string
          join_code: string
          name: string
          remaining_on_pause_seconds: number | null
          session_id: string
          state_version: number
          status: Database["public"]["Enums"]["team_status"]
          step_deadline: string | null
          step_started_at: string | null
        }
        Insert: {
          created_at?: string
          current_step?: number
          id?: string
          join_code?: string
          name: string
          remaining_on_pause_seconds?: number | null
          session_id: string
          state_version?: number
          status?: Database["public"]["Enums"]["team_status"]
          step_deadline?: string | null
          step_started_at?: string | null
        }
        Update: {
          created_at?: string
          current_step?: number
          id?: string
          join_code?: string
          name?: string
          remaining_on_pause_seconds?: number | null
          session_id?: string
          state_version?: number
          status?: Database["public"]["Enums"]["team_status"]
          step_deadline?: string | null
          step_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _advance: {
        Args: { p_actor_kind: string; p_reason: string; p_team: string }
        Returns: undefined
      }
      _bump: { Args: { p_team: string }; Returns: undefined }
      _current_step: { Args: { p_team: string }; Returns: Json }
      _elapsed_seconds: { Args: { p_team: string }; Returns: number }
      _log: {
        Args: {
          p_actor_kind: string
          p_payload?: Json
          p_session: string
          p_team: string
          p_type: string
        }
        Returns: undefined
      }
      _released: { Args: { p_kind: string; p_team: string }; Returns: Json }
      _require_staff: { Args: never; Returns: undefined }
      add_time: {
        Args: { p_seconds: number; p_team_id: string }
        Returns: undefined
      }
      advance_expired_steps: { Args: never; Returns: number }
      advance_team: { Args: { p_team_id: string }; Returns: undefined }
      can_view_media: { Args: { p_path: string }; Returns: boolean }
      create_variant: {
        Args: { p_client_id: string; p_template_id: string; p_title: string }
        Returns: string
      }
      finish_session: { Args: { p_session_id: string }; Returns: undefined }
      generate_join_code: { Args: never; Returns: string }
      get_team_view: { Args: { p_team_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      join_team: {
        Args: {
          p_accept_terms: boolean
          p_code: string
          p_display_name: string
        }
        Returns: string
      }
      pause_session: { Args: { p_session_id: string }; Returns: undefined }
      release_item: {
        Args: {
          p_item_id: string
          p_kind: string
          p_session_id: string
          p_team_ids?: string[]
        }
        Returns: undefined
      }
      reorder_steps: {
        Args: { p_exercise_id: string; p_step_ids: string[] }
        Returns: undefined
      }
      resume_session: { Args: { p_session_id: string }; Returns: undefined }
      save_draft: {
        Args: { p_content: Json; p_question_id: string; p_team_id: string }
        Returns: undefined
      }
      send_staff_message: {
        Args: { p_body: string; p_team_id: string }
        Returns: undefined
      }
      send_team_message: {
        Args: { p_body: string; p_team_id: string }
        Returns: undefined
      }
      server_now: { Args: never; Returns: string }
      start_session: { Args: { p_session_id: string }; Returns: undefined }
      stop_session: { Args: { p_session_id: string }; Returns: undefined }
      submit_answers: { Args: { p_team_id: string }; Returns: undefined }
    }
    Enums: {
      content_type:
        | "video"
        | "image"
        | "audio"
        | "document"
        | "article"
        | "text"
      end_of_time: "auto" | "facilitator"
      exercise_kind: "template" | "variant"
      question_type: "open" | "single_choice" | "multiple_choice" | "yes_no"
      session_status: "draft" | "running" | "paused" | "finished" | "stopped"
      staff_role: "admin" | "facilitator"
      team_status: "waiting" | "running" | "time_up" | "finished"
      trigger_mode: "auto" | "manual"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      content_type: ["video", "image", "audio", "document", "article", "text"],
      end_of_time: ["auto", "facilitator"],
      exercise_kind: ["template", "variant"],
      question_type: ["open", "single_choice", "multiple_choice", "yes_no"],
      session_status: ["draft", "running", "paused", "finished", "stopped"],
      staff_role: ["admin", "facilitator"],
      team_status: ["waiting", "running", "time_up", "finished"],
      trigger_mode: ["auto", "manual"],
    },
  },
} as const
