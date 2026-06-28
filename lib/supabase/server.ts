import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/types/database";

export function createServerSupabaseClient() {
  return createServerComponentClient<Database>({ cookies });
}
