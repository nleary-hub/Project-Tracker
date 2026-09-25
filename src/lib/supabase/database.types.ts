// Generated from the Supabase project schema (supabase gen types). Do not edit by hand:
// regenerate after every migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      departments: {
        Row: {
          archived_at: string | null;
          created_at: string;
          id: string;
          name: string;
          rank: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          rank: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          rank?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          label: string | null;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["workspace_role"];
          token: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          label?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["workspace_role"];
          token?: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          label?: string | null;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["workspace_role"];
          token?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_settings: {
        Row: {
          layout_sharing: Database["public"]["Enums"]["layout_sharing"];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          layout_sharing?: Database["public"]["Enums"]["layout_sharing"];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          layout_sharing?: Database["public"]["Enums"]["layout_sharing"];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          slug: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: {
        Args: { p_token: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "workspaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_workspace: {
        Args: { p_name: string; p_slug: string };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          slug: string;
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "workspaces";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      invite_preview: {
        Args: { p_token: string };
        Returns: {
          role: Database["public"]["Enums"]["workspace_role"];
          status: string;
          workspace_name: string;
          workspace_slug: string;
        }[];
      };
      is_workspace_admin: { Args: { ws: string }; Returns: boolean };
      is_workspace_member: { Args: { ws: string }; Returns: boolean };
      shares_workspace_with: { Args: { other_user: string }; Returns: boolean };
      workspace_role: {
        Args: { ws: string };
        Returns: Database["public"]["Enums"]["workspace_role"];
      };
    };
    Enums: {
      layout_sharing: "shared" | "split" | "personal";
      workspace_role: "owner" | "admin" | "member";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      layout_sharing: ["shared", "split", "personal"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const;
