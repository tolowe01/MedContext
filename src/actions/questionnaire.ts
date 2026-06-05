'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BASELINE_SCHEMA_VERSION } from '@/lib/questionnaire-schema'
import type { BaselineQuestionnaire, QuestionnaireHealth } from '@/lib/types'

export async function saveQuestionnaire(health: QuestionnaireHealth) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // The `patients` table has SELECT-only RLS (no UPDATE policy), so writes go
  // through the service-role client — scoped to this user's own profile_id.
  const admin = createAdminClient()

  const { data: patient } = await admin
    .from('patients')
    .select('baseline_questionnaire')
    .eq('profile_id', user.id)
    .single()

  const existing = (patient?.baseline_questionnaire ?? null) as BaselineQuestionnaire | null

  const merged: BaselineQuestionnaire = {
    schema_version: BASELINE_SCHEMA_VERSION,
    // Preserve the `contact` block written at signup.
    contact: existing?.contact ?? { sexe: 'prefer_not_to_say', phone: '', address: '' },
    health,
  }

  const { error } = await admin
    .from('patients')
    .update({
      baseline_questionnaire: merged,
      questionnaire_schema_version: BASELINE_SCHEMA_VERSION,
    })
    .eq('profile_id', user.id)

  if (error) return { error: error.message }
  redirect('/onboarding/complete')
}
