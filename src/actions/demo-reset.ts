'use server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function resetDemo() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return { error: 'Demo reset not available' }
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'pharmacist') return { error: 'Not authorized' }

  // Use service role to delete and re-seed (bypasses RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Delete all submissions and interventions
  await adminClient
    .from('interventions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  await adminClient
    .from('weekly_submissions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  return { success: true, message: 'Demo state reset. Re-run seed script to restore logs.' }
}
