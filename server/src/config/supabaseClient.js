import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in."
  );
}

// We use the service role key because this is a trusted backend, not a browser.
// It bypasses row level security, so this client must never be exposed to the frontend.
export const supabase = createClient(supabaseUrl, supabaseKey);
