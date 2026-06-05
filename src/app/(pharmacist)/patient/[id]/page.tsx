import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import TrendSparkline from '@/components/pharmacist/TrendSparkline'
import AISynthesisPanel from '@/components/pharmacist/AISynthesisPanel'
import VerifiedReadingClientWrapper from './VerifiedReadingClientWrapper'
import DecisionPanel from '@/components/pharmacist/DecisionPanel'
import type {
  DailyLog,
  Patient,
  Profile,
  PharmacistVerifiedReading,
  WeeklySubmission,
  MonitoringPeriod,
  MonitoringStatus,
  Medication,
  CriticalAlert,
  Consultation,
} from '@/lib/types'
import { questionnaireSchema } from '@/lib/questionnaire-schema'

interface PatientPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ highlight?: string }>
}

const STATUS_LABELS: Record<MonitoringStatus, string> = {
  invited: 'Invited',
  active: 'Monitoring active',
  submitted: 'Awaiting decision',
  critical_alert: 'Critical alert',
  approved: 'Approved',
  consultation_scheduled: 'Consultation scheduled',
  consultation_completed: 'Consultation completed',
  monitor_extended: 'Monitoring extended',
  escalated: 'Escalated to physician',
}

function statusDotClass(status: MonitoringStatus): string {
  if (status === 'critical_alert' || status === 'escalated') return 'bg-emergency'
  if (status === 'submitted' || status === 'approved' || status === 'monitor_extended')
    return 'bg-mc-primary-400'
  if (status === 'consultation_scheduled' || status === 'consultation_completed')
    return 'bg-mc-neutral-400'
  return 'bg-mc-neutral-400'
}

function getAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

const TELUS_MEDS = [
  { name: 'Amlodipine', dose: '5 mg', frequency: 'once daily', timing: 'morning' },
  { name: 'Hydrochlorothiazide', dose: '12.5 mg', frequency: 'once daily', timing: 'morning' },
  { name: 'Ramipril', dose: '10 mg', frequency: 'once daily', timing: 'evening' },
]

export default async function PatientPage({ params, searchParams }: PatientPageProps) {
  const { id } = await params
  const { highlight } = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch patient with profile
  const { data: patientRow } = await supabase
    .from('patients')
    .select('*, profiles!patients_profile_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!patientRow) notFound()

  const patient = patientRow as Patient & { profiles: Profile }
  const profile = patient.profiles

  // Fetch last 7 daily logs
  const { data: logsData } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('patient_id', id)
    .order('log_date', { ascending: false })
    .limit(7)

  const logs = (logsData ?? []) as DailyLog[]

  // Fetch pharmacist verified readings
  const { data: verifiedData } = await supabase
    .from('pharmacist_verified_readings')
    .select('*')
    .eq('patient_id', id)
    .order('reading_date', { ascending: false })

  const verifiedReadings = (verifiedData ?? []) as PharmacistVerifiedReading[]
  const latestVerified = verifiedReadings[0] ?? null

  // Fetch latest active submission
  const { data: activeSubmissionData } = await supabase
    .from('weekly_submissions')
    .select('*')
    .eq('patient_id', id)
    .in('status', ['submitted', 'follow_up'])
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single()

  const activeSubmission = activeSubmissionData as WeeklySubmission | null

  // Most-recent monitoring period for this patient (drives the decision panel).
  const { data: periodData } = await supabase
    .from('monitoring_periods')
    .select('*')
    .eq('patient_id', id)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const period = periodData as MonitoringPeriod | null

  // Medications for the period (for the NEW flag + prescribing physician name).
  let periodMedications: Medication[] = []
  if (period?.medication_list_id) {
    const { data: medsData } = await supabase
      .from('medications')
      .select('*')
      .eq('medication_list_id', period.medication_list_id)
      .order('created_at', { ascending: true })
    periodMedications = (medsData ?? []) as Medication[]
  }

  // Unacknowledged critical alert for the period (gates the decision UI).
  let unackedAlert: CriticalAlert | null = null
  if (period) {
    const { data: alertData } = await supabase
      .from('critical_alerts')
      .select('*')
      .eq('monitoring_period_id', period.id)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    unackedAlert = (alertData as CriticalAlert | null) ?? null
  }

  // Latest consultation for the period (for the post-consultation branch).
  let latestConsultation: Consultation | null = null
  if (period) {
    const { data: consultData } = await supabase
      .from('consultations')
      .select('*')
      .eq('monitoring_period_id', period.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    latestConsultation = (consultData as Consultation | null) ?? null
  }

  const age = getAge(patient.date_of_birth)
  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed Patient'
    : 'Unknown Patient'
  const bq = patient.baseline_questionnaire ?? {}

  const allergies = bq.allergies
    ? bq.allergies
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : []

  const otherFields = questionnaireSchema.filter(
    (f) => f.id !== 'allergies' && bq[f.id] != null && bq[f.id] !== ''
  )

  const latestPatientLog = logs.length > 0 ? logs[0] : null
  const highlightedLog = highlight ? logs.find((l) => l.id === highlight) ?? null : null

  return (
    <main className="min-h-screen bg-mc-surface-page text-mc-neutral-900 font-body py-6">
      <div className="mx-auto max-w-5xl mc-rise">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <h1 className="font-display text-2xl font-semibold -tracking-[0.022em] text-mc-neutral-900">
            {fullName}
          </h1>
          {period && (
            <Badge className="bg-mc-neutral-100 text-mc-neutral-600 rounded-full text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1.5 normal-case tracking-normal border-0">
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusDotClass(period.status)}`}
                aria-hidden
              />
              {STATUS_LABELS[period.status]}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1 - Profile + Questionnaire */}
          <div className="bg-mc-surface-white border border-mc-neutral-200 shadow-sm rounded-tile p-6 space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold -tracking-[0.014em] text-mc-neutral-900 mb-1">
                Profile
              </h2>
              <p className="text-mc-neutral-400 text-sm">
                Age {age} · {patient.diagnosis}
              </p>
            </div>

            {allergies.length > 0 && (
              <div>
                <p className="text-xs font-medium tracking-wide uppercase text-mc-neutral-400 mb-2">Allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((allergy: string) => (
                    <span
                      key={allergy}
                      className="bg-mc-neutral-100 border border-mc-neutral-200 text-mc-neutral-600 text-xs px-2 py-0.5 rounded-chip"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {otherFields.length > 0 && (
              <div className="space-y-2.5">
                {otherFields.map((field) => (
                  <div key={field.id}>
                    <p className="text-mc-neutral-400 text-xs">{field.label}</p>
                    <p className="text-mc-neutral-900 text-sm">{bq[field.id]}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel 2 - PMS meds */}
          <div className="bg-mc-surface-white border border-mc-neutral-200 shadow-sm rounded-tile p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-base font-semibold -tracking-[0.014em] text-mc-neutral-900">
                Medications
              </h2>
              <Badge className="bg-mc-neutral-100 text-mc-neutral-400 text-xs font-medium px-2 py-0.5 rounded-full normal-case tracking-normal border-0">
                PMS (pharmacy management system)
              </Badge>
            </div>
            <ul className="space-y-3">
              {TELUS_MEDS.map((med) => (
                <li key={med.name} className="flex flex-col gap-0.5">
                  <span className="text-mc-neutral-900 text-sm font-medium">
                    {med.name} {med.dose}
                  </span>
                  <span className="text-mc-neutral-400 text-sm">
                    {med.frequency}, {med.timing}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Panel 3 - AI Synthesis */}
          <div className="bg-mc-surface-white border border-mc-neutral-200 shadow-sm rounded-tile p-6">
            {activeSubmission ? (
              <AISynthesisPanel
                submissionId={activeSubmission.id}
                initialText={activeSubmission.ai_synthesis_text}
                editedText={activeSubmission.ai_synthesis_edited_text}
              />
            ) : (
              <div>
                <h2 className="font-display text-base font-semibold -tracking-[0.014em] text-mc-neutral-900 mb-2">
                  AI Summary
                </h2>
                <p className="text-mc-neutral-400 text-sm">No pending submission to review.</p>
              </div>
            )}
          </div>

          {/* Panel 4 - 7-day Trends */}
          <div className="bg-mc-surface-white border border-mc-neutral-200 shadow-sm rounded-tile p-6 space-y-5">
            <div>
              <h2 className="font-display text-base font-semibold -tracking-[0.014em] text-mc-neutral-900 mb-3">
                7-Day Trends
              </h2>
              {highlightedLog && (
                <p className="text-emergency text-sm mb-2">
                  Flagged reading on {highlightedLog.log_date}: {highlightedLog.systolic}/
                  {highlightedLog.diastolic}
                </p>
              )}
              <TrendSparkline logs={logs} />
            </div>

            <VerifiedReadingClientWrapper
              patientId={id}
              latestPatientLog={latestPatientLog}
              initialVerifiedReading={latestVerified}
            />
          </div>
        </div>

        {period && (
          <div className="mt-4">
            <DecisionPanel
              period={period}
              medications={periodMedications}
              unackedAlert={unackedAlert}
              consultation={latestConsultation}
            />
          </div>
        )}
      </div>
    </main>
  )
}
