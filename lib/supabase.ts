import { createClient } from "@supabase/supabase-js";

// Check if Supabase is properly configured (not just placeholder values)
const isSupabaseConfigured = 
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_ANON_KEY &&
  !process.env.SUPABASE_URL.includes('your_supabase_url_here') &&
  !process.env.SUPABASE_ANON_KEY.includes('your_supabase_anon_key_here');

if (!isSupabaseConfigured) {
  console.warn("Supabase is not properly configured. Logging will be disabled.");
}

export const supabase = isSupabaseConfigured 
  ? createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )
  : null;

export interface QuestionLog {
  question: string;
  processing_time?: number;
  provider?: string;
  has_sources?: boolean;
  source_count?: number;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function logQuestion(log: QuestionLog) {
  if (!supabase) {
    // Supabase not configured, skip logging
    return;
  }
  
  try {
    const { error } = await supabase.from("user_questions").insert([log]);

    if (error) {
      console.error("Failed to log question:", error);
      // Don't throw - we don't want logging failures to affect the user experience
    }
  } catch (err) {
    console.error("Error logging question:", err);
    // Don't throw - we don't want logging failures to affect the user experience
  }
}
