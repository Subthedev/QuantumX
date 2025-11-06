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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      crypto_reports: {
        Row: {
          coin_symbol: string
          confidence_score: number
          created_at: string
          id: string
          prediction_summary: string
          report_data: Json
          user_id: string
        }
        Insert: {
          coin_symbol: string
          confidence_score: number
          created_at?: string
          id?: string
          prediction_summary: string
          report_data: Json
          user_id: string
        }
        Update: {
          coin_symbol?: string
          confidence_score?: number
          created_at?: string
          id?: string
          prediction_summary?: string
          report_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          created_at: string
          id: string
          question_1: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_5: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          user_id?: string
        }
        Relationships: []
      }
      intelligence_signals: {
        Row: {
          id: string
          symbol: string
          signal_type: string
          timeframe: string
          entry_min: number
          entry_max: number
          current_price: number
          stop_loss: number | null
          target_1: number | null
          target_2: number | null
          target_3: number | null
          confidence: number
          strength: string
          risk_level: string
          status: string
          hit_target: number | null
          hit_stop_loss: boolean
          entry_price: number | null
          exit_price: number | null
          profit_loss_percent: number | null
          created_at: string
          expires_at: string
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          symbol: string
          signal_type: string
          timeframe?: string
          entry_min: number
          entry_max: number
          current_price: number
          stop_loss?: number | null
          target_1?: number | null
          target_2?: number | null
          target_3?: number | null
          confidence: number
          strength: string
          risk_level: string
          status?: string
          hit_target?: number | null
          hit_stop_loss?: boolean
          entry_price?: number | null
          exit_price?: number | null
          profit_loss_percent?: number | null
          created_at?: string
          expires_at: string
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          signal_type?: string
          timeframe?: string
          entry_min?: number
          entry_max?: number
          current_price?: number
          stop_loss?: number | null
          target_1?: number | null
          target_2?: number | null
          target_3?: number | null
          confidence?: number
          strength?: string
          risk_level?: string
          status?: string
          hit_target?: number | null
          hit_stop_loss?: boolean
          entry_price?: number | null
          exit_price?: number | null
          profit_loss_percent?: number | null
          created_at?: string
          expires_at?: string
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          coin_id: string
          coin_image: string | null
          coin_name: string
          coin_symbol: string
          created_at: string
          id: string
          notes: string | null
          purchase_date: string
          purchase_price: number
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coin_id: string
          coin_image?: string | null
          coin_name: string
          coin_symbol: string
          created_at?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          purchase_price: number
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coin_id?: string
          coin_image?: string | null
          coin_name?: string
          coin_symbol?: string
          created_at?: string
          id?: string
          notes?: string | null
          purchase_date?: string
          purchase_price?: number
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          email: string | null
          feedback_count: number
          id: string
          last_feedback_shown: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          email?: string | null
          feedback_count?: number
          id?: string
          last_feedback_shown?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          email?: string | null
          feedback_count?: number
          id?: string
          last_feedback_shown?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profit_guard_positions: {
        Row: {
          ai_analysis: string | null
          coin_id: string
          coin_image: string | null
          coin_name: string
          coin_symbol: string
          created_at: string
          current_price: number
          entry_price: number
          id: string
          investment_period: number
          last_notification_at: string | null
          profit_levels: Json
          quantity: number
          status: string
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          coin_id: string
          coin_image?: string | null
          coin_name: string
          coin_symbol: string
          created_at?: string
          current_price: number
          entry_price: number
          id?: string
          investment_period?: number
          last_notification_at?: string | null
          profit_levels?: Json
          quantity: number
          status?: string
          timeframe?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          coin_id?: string
          coin_image?: string | null
          coin_name?: string
          coin_symbol?: string
          created_at?: string
          current_price?: number
          entry_price?: number
          id?: string
          investment_period?: number
          last_notification_at?: string | null
          profit_levels?: Json
          quantity?: number
          status?: string
          timeframe?: string
          updated_at?: string
          user_id?: string
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
      can_generate_report: {
        Args: { coin: string; user_uuid: string }
        Returns: boolean
      }
      can_generate_unlimited_reports: {
        Args: { _user_id: string }
        Returns: boolean
      }
      consume_credit: {
        Args: { _user_id: string }
        Returns: boolean
      }
      grant_feedback_credits: {
        Args: { _credits: number; _user_id: string }
        Returns: undefined
      }
      has_credits: {
        Args: { _user_id: string }
        Returns: boolean
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
      app_role: "admin" | "tester" | "user"
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
      app_role: ["admin", "tester", "user"],
    },
  },
} as const
