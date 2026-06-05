import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import { redirect } from 'next/navigation'
import { DailyLog, BaselineQuestionnaire, MonitoringPeriod } from '@/lib/types'
import { SOPHIE_TELUS_MEDS } from '@/lib/telus-meds'
import StreakBadge from '@/components/patient/StreakBadge'
import DataEntryTimeline from '@/components/patient/DataEntryTimeline'
import DailyCheckInForm from '@/components/patient/DailyCheckInForm'

// No pharmacy phone column exists yet; use a clearly-marked placeholder until
// pharmacy contact details are modeled.
const PLACEHOLDER_PHARMACY_PHONE = '5145550100'

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

async function getMedNames(medicationListId: string | null): Promise<string[]> {
  if (!medicationListId) {
    return SOPHIE_TELUS_MEDS.map((med) => med.name)
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('medications')
    .select('name')
    .eq('medication_list_id', medicationListId)

  if (!data || data.length === 0) {
    return SOPHIE_TELUS_MEDS.map((med) => med.name)
  }
  return data.map((med) => med.name as string)
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-ln-canvas text-ln-ink font-ln-text px-screenX pt-screenTop pb-20">
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </main>
  )
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
      <Shell>
        <p className="text-lg text-ln-inkMuted">Patient record not found.</p>
      </Shell>
    )
  }

  // Gate: patients who haven't completed the onboarding questionnaire go back to it.
  const baseline = patient.baseline_questionnaire as BaselineQuestionnaire | null
  if (!baseline?.health) {
    redirect('/onboarding/consent')
  }

  // Resolve the patient's monitoring period: prefer an active one, then an
  // invited one. The latest of each takes precedence.
  const { data: periods } = await supabase
    .from('monitoring_periods')
    .select('*')
    .eq('patient_id', patient.id)
    .in('status', ['active', 'invited'])
    .order('created_at', { ascending: false })

  const periodList = (periods ?? []) as MonitoringPeriod[]
  const activePeriod = periodList.find((p) => p.status === 'active') ?? null
  const invitedPeriod = periodList.find((p) => p.status === 'invited') ?? null

  if (!activePeriod) {
    if (invitedPeriod) {
      redirect(`/invitation/${invitedPeriod.id}`)
    }

    return (
      <Shell>
        <p className="ln-eyebrow mb-3">Tracking</p>
        <div className="ln-panel ln-rise rounded-ln-lg p-8 flex flex-col items-center text-center gap-3">
          <h2 className="font-ln-display text-2xl font-semibold tracking-ln-tight text-ln-ink">
            No active monitoring right now
          </h2>
          <p className="text-lg text-ln-inkMuted leading-relaxed max-w-md">
            When your pharmacist starts a monitoring period for you, it will appear here and you can
            begin your daily check-ins.
          </p>
        </div>
      </Shell>
    )
  }

  const [todayLog, recentLogs] = await Promise.all([
    getTodayLog(patient.id),
    getRecentLogs(patient.id),
  ])

  if (todayLog) {
    const streak = computeStreak(recentLogs)
    return (
      <Shell>
        <h1 className="font-ln-display font-semibold text-screenTitle text-ln-ink mb-6">
          Today is done
        </h1>
        <div className="bg-ln-surface1 border border-ln-hairline rounded-ln-xl p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-3">
            <h2 className="font-ln-display font-semibold text-sectionTitle text-ln-ink">
              You have checked in today
            </h2>
            <p className="font-ln-text text-body text-ln-inkMuted leading-relaxed">
              Thank you for showing up. See you tomorrow.
            </p>
            <StreakBadge streak={streak} />
          </div>
          <div>
            <p className="font-ln-text font-semibold text-cta text-ln-inkMuted uppercase tracking-wide mb-3">
              This week
            </p>
            <DataEntryTimeline logs={recentLogs} />
          </div>
        </div>
      </Shell>
    )
  }

  const medNames = await getMedNames(activePeriod.medication_list_id)

  return (
    <Shell>
      <h1 className="font-ln-display font-semibold text-screenTitle text-ln-ink mb-6">
        Daily check-in
      </h1>
      <DailyCheckInForm pharmacyPhone={PLACEHOLDER_PHARMACY_PHONE} medNames={medNames} />
    </Shell>
  )
}
