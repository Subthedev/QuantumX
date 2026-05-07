// QuantumX trading state lives in the new Supabase project (abdjyaumafnewqjhsjlq)
// because the original `vidziydspeewmcexqicg` project is paused on the free tier
// pending profitability of the agents. Old project values kept commented for the
// future restore migration.
//
// const SUPABASE_URL = "https://vidziydspeewmcexqicg.supabase.co"; // QuantumX (paused)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://abdjyaumafnewqjhsjlq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiZGp5YXVtYWZuZXdxamhzamxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzE5MTIsImV4cCI6MjA5Mzc0NzkxMn0.3te5vDG-cy6JbftpBgUOj0VC-IeKdOr9LgXHQaoPv_E";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});