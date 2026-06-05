'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Patient accepts a pharmacist invitation, moving the monitoring period from
 * `invited` to `active`. RLS only permits this exact transition for the owning
 * patient. This action redirects, so callers do not branch on a return value;
 * throwing on error is acceptable here.
 */
export async function acceptInvitation(periodId: string): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!patient) {
    throw new Error('Patient record not found')
  }

  const { error } = await supabase
    .from('monitoring_periods')
    .update({ status: 'active' })
    .eq('id', periodId)
    .eq('patient_id', patient.id)
    .eq('status', 'invited')

  if (error) {
    throw new Error(error.message)
  }

  redirect('/tracking')
}
