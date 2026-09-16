// Dual-mode backend switch.
// If VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, the app runs in
// LOCAL MODE: Supabase Auth + direct Supabase database access + the
// studymate-ai Supabase Edge Function (Groq).
// If they are absent, the app runs exactly as before on the Base44 platform.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLocalMode = () => !!(url && anonKey);

export const supabase = isLocalMode()
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;