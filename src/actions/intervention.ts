'use server'
import { createClient } from '@/lib/supabase/server'
import type { InterventionKind } from '@/lib/types'

interface InterventionPayload {
  phone_time?: string
  note_text?: string
  appointment_date?: string
  message?: string
}

export async function createIntervention(
  submissionId: string,
  kind: InterventionKind,
  payload: InterventionPayload
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: interventionError } = await supabase.from('interventions').insert({
    submission_id: submissionId,
    kind,
    payload,
  })

  if (interventionError) return { error: interventionError.message }

  const { error: statusError } = await supabase
    .from('weekly_submissions')
    .update({
      status: kind === 'approval' ? 'reviewed' : 'follow_up',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', submissionId)

  if (statusError) return { error: statusError.message }
  return { success: true }
}
