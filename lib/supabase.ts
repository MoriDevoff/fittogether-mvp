import { type SupabaseClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    // IMPORTANT: use cookie-based auth so `proxy.ts` can read session server-side.
    browserClient = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }
  return browserClient
}