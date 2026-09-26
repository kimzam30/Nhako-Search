import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[NhakoSearch] Supabase is not configured. Copy .env.example to .env.local and ' +
      'set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Auth, progress saving and multiplayer will not work until you do.'
  );
}

/*
 * A syntactically valid stand-in so `createClient` does not throw while this
 * module is being evaluated.
 *
 * `createClient('')` throws "supabaseUrl is required" at import time, which
 * took down the whole production build during prerendering: a missing env var
 * surfaced as an opaque stack trace from inside a Turbopack chunk rather than a
 * readable message. Requests against this placeholder still fail loudly at
 * runtime, so a misconfiguration cannot pass silently.
 */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'public-anon-key-not-configured';

export const supabase = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || PLACEHOLDER_KEY
);
