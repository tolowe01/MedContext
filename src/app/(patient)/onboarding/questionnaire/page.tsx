import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuestionnaireWizard from '@/components/patient/QuestionnaireWizard'
import { saveQuestionnaire } from '@/actions/questionnaire'
import type { BaselineQuestionnaire, Sexe } from '@/lib/types'

export default async function QuestionnairePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('baseline_questionnaire')
    .eq('profile_id', user.id)
    .maybeSingle()

  const baseline = (patient?.baseline_questionnaire ?? null) as BaselineQuestionnaire | null
  const sexe: Sexe = baseline?.contact?.sexe ?? 'prefer_not_to_say'

  return (
    <main className="min-h-screen bg-dialogue-bg px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-dialogue-text mb-2">
        Tell us about yourself
      </h1>
      <p className="font-body text-body text-dialogue-textMuted mb-6">
        A few quick questions so your pharmacist has the full picture.
      </p>

      <QuestionnaireWizard sexe={sexe} onComplete={saveQuestionnaire} />
    </main>
  )
}
