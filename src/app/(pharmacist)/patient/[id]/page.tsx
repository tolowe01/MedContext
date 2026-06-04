import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import TrendSparkline from '@/components/pharmacist/TrendSparkline'
import AISynthesisPanel from '@/components/pharmacist/AISynthesisPanel'
import VerifiedReadingClientWrapper from './VerifiedReadingClientWrapper'
import InterventionPanel from '@/components/pharmacist/InterventionPanel'
import type {
  DailyLog,
  Patient,
  Profile,
  PharmacistVerifiedReading,
  WeeklySubmission,
} from '@/lib/types'
import { questionnaireSchema } from '@/lib/questionnaire-schema'

interface PatientPageProps {
  params: Promise<{ id: string }>
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

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params

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

  const age = getAge(patient.date_of_birth)
  const fullName = `${profile.first_name} ${profile.last_name}`
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

  return (
    <main className="min-h-screen bg-dialogue-bg p-6">
      <h1 className="font-display-bold text-sectionTitle text-dialogue-text mb-6">{fullName}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1 — Profile + Questionnaire */}
        <div className="bg-dialogue-surface rounded-card p-5 space-y-4">
          <div>
            <h2 className="font-display-semi text-sectionTitle text-dialogue-text mb-1">Profile</h2>
            <p className="text-dialogue-textMuted font-body text-sm">
              Age {age} · {patient.diagnosis}
            </p>
          </div>

          {allergies.length > 0 && (
            <div>
              <p className="text-dialogue-textMuted font-body text-xs mb-2">Allergies</p>
              <div className="flex flex-wrap gap-1.5">
                {allergies.map((allergy: string) => (
                  <span
                    key={allergy}
                    className="bg-dialogue-chip text-dialogue-text text-xs font-body px-2 py-0.5 rounded-chip"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          )}

          {otherFields.length > 0 && (
            <div className="space-y-2">
              {otherFields.map((field) => (
                <div key={field.id}>
                  <p className="text-dialogue-textMuted font-body text-xs">{field.label}</p>
                  <p className="text-dialogue-text font-body text-body">{bq[field.id]}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2 — Telus Health meds */}
        <div className="bg-dialogue-surface rounded-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display-semi text-sectionTitle text-dialogue-text">Medications</h2>
            <Badge className="bg-dialogue-chip text-dialogue-textMuted text-xs font-body px-2 py-0.5">
              Pulled from Telus Health
            </Badge>
          </div>
          <ul className="space-y-3">
            {TELUS_MEDS.map((med) => (
              <li key={med.name} className="flex flex-col gap-0.5">
                <span className="text-dialogue-text font-body-bold text-cta">
                  {med.name} {med.dose}
                </span>
                <span className="text-dialogue-textMuted font-body text-sm">
                  {med.frequency}, {med.timing}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Panel 3 — AI Synthesis */}
        <div className="bg-dialogue-surface rounded-card p-5">
          {activeSubmission ? (
            <AISynthesisPanel
              submissionId={activeSubmission.id}
              initialText={activeSubmission.ai_synthesis_text}
              editedText={activeSubmission.ai_synthesis_edited_text}
            />
          ) : (
            <div>
              <h2 className="font-display-semi text-sectionTitle text-dialogue-text mb-2">
                AI Summary
              </h2>
              <p className="text-dialogue-textMuted font-body text-sm">
                No pending submission to review.
              </p>
            </div>
          )}
        </div>

        {/* Panel 4 — 7-day Trends */}
        <div className="bg-dialogue-surface rounded-card p-5 space-y-5">
          <div>
            <h2 className="font-display-semi text-sectionTitle text-dialogue-text mb-3">
              7-Day Trends
            </h2>
            <TrendSparkline logs={logs} />
          </div>

          <VerifiedReadingClientWrapper
            patientId={id}
            latestPatientLog={latestPatientLog}
            initialVerifiedReading={latestVerified}
          />

          {activeSubmission && (
            <InterventionPanel
              submissionId={activeSubmission.id}
              currentStatus={activeSubmission.status}
            />
          )}
        </div>
      </div>
    </main>
  )
}
