import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { flagSubmission } from '@/lib/flags'
import PatientTriageList from '@/components/pharmacist/PatientTriageList'
import type { SubmissionWithPatientSummary } from '@/components/pharmacist/PatientTriageList'
import type { CriticalAlert, DailyLog, WeeklySubmission, Patient, Profile } from '@/lib/types'
import DashboardRealtimeListener from './DashboardRealtimeListener'
import CriticalAlertBanner from './CriticalAlertBanner'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('pharmacy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.pharmacy_id) {
    return (
      <main className="min-h-screen bg-mc-surface-page p-6">
        <h1 className="font-display font-semibold text-sectionTitle text-mc-neutral-900 mb-4">
          Patient Dashboard
        </h1>
        <p className="text-mc-neutral-600 font-body">No pharmacy associated with your account.</p>
      </main>
    )
  }

  const pharmacyId: string = profile.pharmacy_id

  const { data: submissions } = await supabase
    .from('weekly_submissions')
    .select(
      `
      *,
      patients!inner(
        *,
        profiles!patients_profile_id_fkey(*)
      )
    `
    )
    .eq('status', 'submitted')
    .eq('patients.pharmacy_id', pharmacyId)
    .order('submitted_at', { ascending: false })

  const enriched: SubmissionWithPatientSummary[] = await Promise.all(
    (submissions ?? []).map(async (row) => {
      const patient = row.patients as Patient & { profiles: Profile }
      const patientWithProfile = {
        ...patient,
        profile: patient.profiles,
      } as Patient & { profile: Profile }

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('patient_id', patient.id)
        .order('log_date', { ascending: false })
        .limit(7)

      const dailyLogs = (logs ?? []) as DailyLog[]
      const flags = flagSubmission(dailyLogs)
      const submission = row as unknown as WeeklySubmission

      return { submission, patient: patientWithProfile, logs: dailyLogs, flags }
    })
  )

  const flagged = enriched.filter((s) => s.flags.length > 0)
  const stable = enriched.filter((s) => s.flags.length === 0)

  const { data: alertRows } = await supabase
    .from('critical_alerts')
    .select('*')
    .eq('pharmacist_id', user.id)
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false })

  const initialAlerts = (alertRows ?? []) as CriticalAlert[]
  const criticalPatientIds: string[] = initialAlerts
    .map((alert) => alert.patient_id)
    .filter((id): id is string => id !== null)

  return (
    <main className="min-h-screen bg-mc-surface-page p-6">
      <CriticalAlertBanner pharmacistId={user.id} initialAlerts={initialAlerts} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-semibold text-sectionTitle text-mc-neutral-900">
          Patient Dashboard
        </h1>
        <Link
          href="/patient/new"
          className="inline-flex items-center rounded-button bg-mc-primary-400 text-white font-body font-semibold text-cta uppercase tracking-wide px-6 py-3 hover:opacity-90 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-mc-surface-page"
        >
          New patient
        </Link>
      </div>
      <DashboardRealtimeListener pharmacyId={pharmacyId} />
      <PatientTriageList
        flagged={flagged}
        stable={stable}
        criticalPatientIds={criticalPatientIds}
      />
    </main>
  )
}
