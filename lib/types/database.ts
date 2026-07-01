export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          timezone: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          timezone?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      responsibilities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          color: string;
          icon: string;
          weekly_goal_hours: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          description?: string;
          color?: string;
          icon?: string;
          weekly_goal_hours?: number;
          sort_order?: number;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["responsibilities"]["Insert"], "id" | "user_id">>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          responsibility_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          due_at: string | null;
          labels: string[];
          subtasks: Json;
          estimate_minutes: number | null;
          completed_at: string | null;
          recurrence: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responsibility_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          due_at?: string | null;
          labels?: string[];
          subtasks?: Json;
          estimate_minutes?: number | null;
          completed_at?: string | null;
          recurrence?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["tasks"]["Insert"], "user_id">>;
        Relationships: [];
      };
      calendar_items: {
        Row: {
          id: string;
          user_id: string;
          responsibility_id: string | null;
          type: string;
          title: string;
          starts_at: string;
          ends_at: string;
          source: string;
          location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responsibility_id?: string | null;
          type: string;
          title: string;
          starts_at: string;
          ends_at: string;
          source?: string;
          location?: string | null;
          notes?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["calendar_items"]["Insert"], "user_id">>;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          responsibility_id: string | null;
          folder_id: string | null;
          title: string;
          body: string;
          labels: string[];
          last_opened_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responsibility_id?: string | null;
          folder_id?: string | null;
          title: string;
          body?: string;
          labels?: string[];
          last_opened_at?: string | null;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["notes"]["Insert"], "user_id">>;
        Relationships: [];
      };
      note_folders: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          sort_order?: number;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["note_folders"]["Insert"], "user_id">>;
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          user_id: string;
          responsibility_id: string | null;
          title: string;
          items: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responsibility_id?: string | null;
          title: string;
          items?: Json;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["lists"]["Insert"], "user_id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
