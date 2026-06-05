import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DailyLog } from '@/lib/types'
import StreakBadge from '@/components/patient/StreakBadge'
import DataEntryTimeline from '@/components/patient/DataEntryTimeline'
import ConsistencyScore from '@/components/patient/ConsistencyScore'

async function getLast7Logs(patientId: string): Promise<DailyLog[]> {
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

export default async function ProgressPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (!patient) {
    return (
      <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20">
        <p className="font-body text-body text-mc-neutral-400">Patient record not found.</p>
      </main>
    )
  }

  const logs = await getLast7Logs(patient.id)
  const logCount = logs.length
  const canSubmit = logCount >= 7
  const daysRemaining = 7 - logCount

  return (
    <main className="min-h-screen bg-mc-surface-page px-screenX pt-screenTop pb-20">
      <h1 className="font-display-bold text-screenTitle text-mc-neutral-900 mb-6">Your progress</h1>

      <div className="mb-4">
        <StreakBadge streak={logCount} />
      </div>

      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-card p-5 mb-4">
        <p className="font-body-bold text-cta text-mc-neutral-400 uppercase tracking-wide mb-4">
          This week
        </p>
        <DataEntryTimeline logs={logs} totalDays={7} />
      </div>

      <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-card p-5 mb-6">
        <ConsistencyScore logs={logs} totalDays={7} />
      </div>

      {canSubmit ? (
        <Link
          href="/submit"
          className="block w-full text-center bg-mc-primary-400 hover:bg-mc-primary-600 text-white font-cta text-cta rounded-button py-4 transition-opacity"
        >
          Submit your week
        </Link>
      ) : (
        <div className="bg-mc-surface-white border border-mc-neutral-200 rounded-card p-5 text-center">
          <p className="font-body text-body text-mc-neutral-900 mb-1">
            {daysRemaining} more {daysRemaining === 1 ? 'day' : 'days'} until you can submit
          </p>
          <p className="font-body text-sm text-mc-neutral-400">
            You need 7 consecutive days of readings to submit your week.
          </p>
        </div>
      )}
    </main>
  )
}
