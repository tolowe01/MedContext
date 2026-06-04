'use server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import type { LogReadingInput } from '@/lib/types'

export async function logReading(
  input: LogReadingInput,
  enteredVia: 'text' | 'voice' = 'text'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!patient) return { error: 'Patient not found' }

  const today = format(new Date(), 'yyyy-MM-dd')

  const { error } = await supabase.from('daily_logs').upsert(
    {
      patient_id: patient.id,
      log_date: today,
      systolic: input.systolic,
      diastolic: input.diastolic,
      heart_rate: input.heart_rate ?? null,
      adherence_taken: input.adherence_taken,
      symptom_note: input.symptom_note ?? null,
      entered_via: enteredVia,
    },
    { onConflict: 'patient_id,log_date' }
  )

  if (error) return { error: error.message }
  return { success: true }
}
