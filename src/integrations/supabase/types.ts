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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author: string
          created_at: string
          id: string
          member_id: string
          text: string
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          member_id: string
          text: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          member_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      coinflips: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          creator_side: string
          id: string
          joiner_id: string | null
          result: string | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          creator_side: string
          id?: string
          joiner_id?: string | null
          result?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          creator_side?: string
          id?: string
          joiner_id?: string | null
          result?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coinflips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflips_joiner_id_fkey"
            columns: ["joiner_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coinflips_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_entries: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          round_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          member_id: string
          round_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jackpot_entries_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "jackpot_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      jackpot_rounds: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          status: string
          total: number
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          status?: string
          total?: number
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          status?: string
          total?: number
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jackpot_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_roles: {
        Row: {
          created_at: string
          id: string
          member_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "member_roles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          balance: number
          created_at: string
          discord_avatar: string | null
          discord_id: string | null
          discord_username: string | null
          id: string
          roblox_avatar: string | null
          roblox_id: string | null
          roblox_username: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id?: string
          roblox_avatar?: string | null
          roblox_id?: string | null
          roblox_username?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          discord_avatar?: string | null
          discord_id?: string | null
          discord_username?: string | null
          id?: string
          roblox_avatar?: string | null
          roblox_id?: string | null
          roblox_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          member_id: string
          note: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          member_id: string
          note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          member_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_balance: {
        Args: {
          _delta: number
          _kind: string
          _member_id: string
          _note: string
        }
        Returns: number
      }
      rate_limit_hit: {
        Args: { _key: string; _limit: number; _window_seconds: number }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "player"
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
      app_role: ["admin", "player"],
    },
  },
} as const
