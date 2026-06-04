'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { QUESTIONNAIRE_SCHEMA_VERSION } from '@/lib/questionnaire-schema'

export async function saveQuestionnaire(data: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('patients')
    .update({
      baseline_questionnaire: data,
      questionnaire_schema_version: QUESTIONNAIRE_SCHEMA_VERSION,
    })
    .eq('profile_id', user.id)

  if (error) return { error: error.message }
  redirect('/onboarding/complete')
}
