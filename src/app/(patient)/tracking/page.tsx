import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import { redirect } from 'next/navigation'
import { DailyLog, BaselineQuestionnaire } from '@/lib/types'
import ChatIntake from '@/components/patient/ChatIntake'

/** Count consecutive days with a log, ending today (if logged) or yesterday. */
function computeStreak(logs: DailyLog[]): number {
  const dates = new Set(logs.map((l) => l.log_date))
  let cursor = new Date()
  if (!dates.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = subDays(cursor, 1)
  }
  let streak = 0
  while (dates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak++
    cursor = subDays(cursor, 1)
  }
  return streak
}

async function getTodayLog(patientId: string): Promise<DailyLog | null> {
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('patient_id', patientId)
    .eq('log_date', today)
    .maybeSingle()

  if (error) {
    return null
  }
  return data as DailyLog | null
}

async function getRecentLogs(patientId: string): Promise<DailyLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('patient_id', patientId)
    .order('log_date', { ascending: false })
    .limit(7)

  if (error) {
    return []
  }
  return (data ?? []) as DailyLog[]
}

export default async function TrackingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: patient } = await supabase
    .from('patients')
    .select('id, baseline_questionnaire')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!patient) {
    return (
      <main className="min-h-screen bg-dialogue-bg px-screenX pt-screenTop pb-20">
        <p className="font-body text-body text-dialogue-textMuted">Patient record not found.</p>
      </main>
    )
  }

  // Gate: patients who haven't completed the onboarding questionnaire go back to it.
  const baseline = patient.baseline_questionnaire as BaselineQuestionnaire | null
  if (!baseline?.health) {
    redirect('/onboarding/consent')
  }

  const [todayLog, recentLogs] = await Promise.all([
    getTodayLog(patient.id),
    getRecentLogs(patient.id),
  ])

  const streak = computeStreak(recentLogs)

  if (todayLog) {
    redirect('/home')
  }

  return (
    <main className="min-h-screen bg-dialogue-bg px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-dialogue-text mb-6">
        Evening check-in
      </h1>
      <ChatIntake patientId={patient.id} logs={recentLogs} streak={streak} />
    </main>
  )
}
