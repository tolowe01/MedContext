import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service-role key.
 *
 * This bypasses Row Level Security and must NEVER be imported into client
 * components. It exists because the `patients` table has SELECT-only RLS
 * policies (no INSERT policy), so a self-registering patient cannot create
 * their own clinical record through the normal anon client. Signup runs the
 * `profiles` + `patients` inserts through this client instead.
 *
 * Same pattern as src/lib/seed.ts.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client'
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
