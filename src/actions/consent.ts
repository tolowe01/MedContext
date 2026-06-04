'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function recordConsent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!patient) throw new Error('Patient record not found')

  const { error } = await supabase.from('consent_records').insert({
    patient_id: patient.id,
    consent_version: 'v1.0',
    purposes: [
      'blood_pressure_monitoring',
      'medication_adherence_tracking',
      'pharmacist_clinical_review',
      'baseline_health_questionnaire',
    ],
  })

  if (error) throw new Error(error.message)
  redirect('/onboarding/disclaimers')
}
