import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("DEBUG: supabaseUrl =", supabaseUrl);
console.log("DEBUG: supabaseAnonKey =", supabaseAnonKey ? "***" : "undefined");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase secrets. URL: ${supabaseUrl ? "found" : "missing"}, Key: ${supabaseAnonKey ? "found" : "missing"}. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Secrets.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
