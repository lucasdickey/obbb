import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL environment variable");
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_ANON_KEY environment variable");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
