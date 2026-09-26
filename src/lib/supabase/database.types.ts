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
          is_demo: boolean;
          name: string;
          rank: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name: string;
          rank: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
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
      milestones: {
        Row: {
          completed_at: string | null;
          created_at: string;
          due_date: string | null;
          id: string;
          is_demo: boolean;
          name: string;
          owner_id: string | null;
          project_id: string;
          rank: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          is_demo?: boolean;
          name: string;
          owner_id?: string | null;
          project_id: string;
          rank: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          due_date?: string | null;
          id?: string;
          is_demo?: boolean;
          name?: string;
          owner_id?: string | null;
          project_id?: string;
          rank?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "milestones_workspace_id_fkey";
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
      projects: {
        Row: {
          created_at: string;
          created_by: string | null;
          department_id: string;
          description: string;
          due_date: string | null;
          health_override: Database["public"]["Enums"]["health_status"] | null;
          health_override_expires_at: string | null;
          health_override_reason: string | null;
          id: string;
          is_demo: boolean;
          name: string;
          owner_id: string | null;
          rank: string;
          start_date: string | null;
          status: Database["public"]["Enums"]["project_status"];
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          department_id: string;
          description?: string;
          due_date?: string | null;
          health_override?: Database["public"]["Enums"]["health_status"] | null;
          health_override_expires_at?: string | null;
          health_override_reason?: string | null;
          id?: string;
          is_demo?: boolean;
          name: string;
          owner_id?: string | null;
          rank: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          department_id?: string;
          description?: string;
          due_date?: string | null;
          health_override?: Database["public"]["Enums"]["health_status"] | null;
          health_override_expires_at?: string | null;
          health_override_reason?: string | null;
          id?: string;
          is_demo?: boolean;
          name?: string;
          owner_id?: string | null;
          rank?: string;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["project_status"];
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      table_layouts: {
        Row: {
          column_order: string[];
          column_widths: Json;
          density: Database["public"]["Enums"]["table_density"];
          hidden_columns: string[];
          id: string;
          row_height_px: number | null;
          sort: Json;
          table_key: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          column_order?: string[];
          column_widths?: Json;
          density?: Database["public"]["Enums"]["table_density"];
          hidden_columns?: string[];
          id?: string;
          row_height_px?: number | null;
          sort?: Json;
          table_key: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          column_order?: string[];
          column_widths?: Json;
          density?: Database["public"]["Enums"]["table_density"];
          hidden_columns?: string[];
          id?: string;
          row_height_px?: number | null;
          sort?: Json;
          table_key?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_layouts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      user_row_ranks: {
        Row: {
          rank: string;
          row_id: string;
          table_key: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          rank: string;
          row_id: string;
          table_key: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          rank?: string;
          row_id?: string;
          table_key?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_row_ranks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      user_table_filters: {
        Row: {
          filters: Json;
          table_key: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          filters?: Json;
          table_key: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          filters?: Json;
          table_key?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_table_filters_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
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
      can_edit_project: { Args: { p: string }; Returns: boolean };
      can_edit_shared_layout: { Args: { ws: string }; Returns: boolean };
      can_edit_shared_order: { Args: { ws: string }; Returns: boolean };
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
      layout_sharing: {
        Args: { ws: string };
        Returns: Database["public"]["Enums"]["layout_sharing"];
      };
      move_project: {
        Args: { p_department?: string; p_project: string; p_rank?: string };
        Returns: undefined;
      };
      set_project_ranks: { Args: { p_ranks: Json }; Returns: number };
      shares_workspace_with: { Args: { other_user: string }; Returns: boolean };
      wipe_demo_data: {
        Args: { ws: string };
        Returns: {
          departments_removed: number;
          projects_removed: number;
        }[];
      };
      workspace_role: {
        Args: { ws: string };
        Returns: Database["public"]["Enums"]["workspace_role"];
      };
    };
    Enums: {
      health_status: "on_track" | "at_risk" | "off_track";
      layout_sharing: "shared" | "split" | "personal";
      project_status: "active" | "on_hold" | "completed" | "cancelled";
      table_density: "compact" | "default" | "comfortable";
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
      health_status: ["on_track", "at_risk", "off_track"],
      layout_sharing: ["shared", "split", "personal"],
      project_status: ["active", "on_hold", "completed", "cancelled"],
      table_density: ["compact", "default", "comfortable"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const;
