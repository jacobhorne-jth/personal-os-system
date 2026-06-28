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
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      responsibilities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          color: Database["public"]["Enums"]["responsibility_color"];
          icon: string;
          weekly_goal_minutes: number;
          sort_order: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          color?: Database["public"]["Enums"]["responsibility_color"];
          icon?: string;
          weekly_goal_minutes?: number;
          sort_order?: number;
          archived_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["responsibilities"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          responsibility_id: string | null;
          parent_task_id: string | null;
          title: string;
          notes: string | null;
          status: Database["public"]["Enums"]["task_status"];
          priority: Database["public"]["Enums"]["task_priority"];
          due_at: string | null;
          recurrence_rule: string | null;
          estimate_minutes: number | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responsibility_id?: string | null;
          parent_task_id?: string | null;
          title: string;
          notes?: string | null;
          status?: Database["public"]["Enums"]["task_status"];
          priority?: Database["public"]["Enums"]["task_priority"];
          due_at?: string | null;
          recurrence_rule?: string | null;
          estimate_minutes?: number | null;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      calendar_items: {
        Row: {
          id: string;
          user_id: string;
          responsibility_id: string | null;
          task_id: string | null;
          type: Database["public"]["Enums"]["calendar_item_type"];
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string;
          all_day: boolean;
          recurrence_rule: string | null;
          source: string;
          external_provider: string | null;
          external_id: string | null;
          external_url: string | null;
          location: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          responsibility_id?: string | null;
          task_id?: string | null;
          type: Database["public"]["Enums"]["calendar_item_type"];
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at: string;
          all_day?: boolean;
          recurrence_rule?: string | null;
          source?: string;
          external_provider?: string | null;
          external_id?: string | null;
          external_url?: string | null;
          location?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_items"]["Insert"]>;
      };
    };
    Enums: {
      responsibility_color: "blue" | "mint" | "coral" | "amber" | "violet";
      task_status: "todo" | "doing" | "done" | "archived";
      task_priority: "low" | "medium" | "high" | "urgent";
      calendar_item_type:
        | "external_event"
        | "app_event"
        | "task_due"
        | "deadline"
        | "time_block"
        | "time_log"
        | "reminder";
      capture_source: "typed" | "voice" | "upload" | "paste" | "quick_task" | "time_log";
      ai_extraction_status: "pending_review" | "approved" | "rejected" | "partially_approved";
    };
  };
};
