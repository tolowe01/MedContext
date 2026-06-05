import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DailyLog, BaselineQuestionnaire } from '@/lib/types'
import { logout } from '@/actions/auth'
import StreakBadge from '@/components/patient/StreakBadge'
import DataEntryTimeline from '@/components/patient/DataEntryTimeline'

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

export default async function HomePage() {
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

  return (
    <main className="min-h-screen bg-dialogue-bg px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-dialogue-text mb-6">
        Patient Dashboard
      </h1>

      <div className="mb-4">
        <StreakBadge streak={streak} />
      </div>

      {!todayLog ? (
        <div className="bg-dialogue-surface border border-dialogue-border rounded-card p-5 mb-6 text-center">
          <p className="font-body text-dialogue-text mb-4">You haven't logged your reading today.</p>
          <Link
            href="/tracking"
            className="inline-block bg-dialogue-accent hover:bg-dialogue-accent/90 text-dialogue-bg font-cta text-cta rounded-button py-3 px-6"
          >
            Start Evening Check-in
          </Link>
        </div>
      ) : (
        <div className="bg-dialogue-surface border border-dialogue-border rounded-card p-5 mb-4">
          <p className="font-body-bold text-cta text-dialogue-textMuted uppercase tracking-wide mb-3">
            Today&apos;s entry
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-dialogue-textMuted text-xs font-body mb-0.5">Systolic</p>
              <p className="font-display-bold text-sectionTitle text-dialogue-text">
                {todayLog.systolic}
              </p>
            </div>
            <div>
              <p className="text-dialogue-textMuted text-xs font-body mb-0.5">Diastolic</p>
              <p className="font-display-bold text-sectionTitle text-dialogue-text">
                {todayLog.diastolic}
              </p>
            </div>
            <div>
              <p className="text-dialogue-textMuted text-xs font-body mb-0.5">Medication</p>
              <p className="font-display-bold text-sectionTitle text-dialogue-text">
                {todayLog.adherence_taken ? '✓' : '✗'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-dialogue-surface border border-dialogue-border rounded-card p-5 mb-6">
        <p className="font-body-bold text-cta text-dialogue-textMuted uppercase tracking-wide mb-3">
          This week
        </p>
        <DataEntryTimeline logs={recentLogs} totalDays={7} />
      </div>

      <Link
        href="/progress"
        className="block w-full text-center bg-dialogue-chip border border-dialogue-border text-dialogue-text font-cta text-cta rounded-button py-4 transition-opacity hover:opacity-80 mb-4"
      >
        View progress
      </Link>

      <form action={logout}>
        <button
          type="submit"
          className="block w-full text-center bg-transparent border border-dialogue-border text-dialogue-textMuted font-cta text-cta rounded-button py-4 transition-opacity hover:bg-dialogue-chip"
        >
          Log out
        </button>
      </form>
    </main>
  )
}
