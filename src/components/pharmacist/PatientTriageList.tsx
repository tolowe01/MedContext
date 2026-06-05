import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import TrendSparkline from './TrendSparkline'
import type { WeeklySubmission, Patient, Profile, DailyLog } from '@/lib/types'
import type { Flag } from '@/lib/flags'

export interface SubmissionWithPatientSummary {
  submission: WeeklySubmission
  patient: Patient & { profile: Profile }
  logs: DailyLog[]
  flags: Flag[]
}

interface PatientTriageListProps {
  flagged: SubmissionWithPatientSummary[]
  stable: SubmissionWithPatientSummary[]
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

const SEVERITY_CHIP_CLASSES: Record<string, string> = {
  high: 'bg-red-600 text-white text-xs px-2 py-0.5 rounded-chip font-body-bold',
  medium: 'bg-dialogue-accent text-dialogue-bg text-xs px-2 py-0.5 rounded-chip font-body-bold',
  low: 'bg-dialogue-chip text-dialogue-textMuted text-xs px-2 py-0.5 rounded-chip font-body',
}

const FLAG_LABELS: Record<string, string> = {
  bp_avg: 'BP avg ↑',
  bp_peak: 'BP peak ↑',
  adherence: 'Low adherence',
  missing_data: 'Missing data',
}

function PatientRow({ item }: { item: SubmissionWithPatientSummary }) {
  const { submission, patient, logs, flags } = item
  const { profile } = patient
  const age = getAge(patient.date_of_birth)
  const name = `${profile.first_name} ${profile.last_name}`
  const submittedAgo = formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })

  return (
    <Link
      href={`/patient/${patient.id}`}
      className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dialogue-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dialogue-bg"
    >
      <div className="bg-dialogue-surface rounded-card p-4 flex items-center gap-4 hover:bg-dialogue-border transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="font-body-bold text-cta text-dialogue-text truncate">
            {name}, {age}
          </p>
          <p className="font-body text-sm text-dialogue-textMuted mt-0.5">{submittedAgo}</p>
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {flags.map((f) => (
                <span key={f.kind} className={SEVERITY_CHIP_CLASSES[f.severity] ?? SEVERITY_CHIP_CLASSES.low}>
                  {FLAG_LABELS[f.kind] ?? f.kind}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <TrendSparkline logs={logs} mini />
        </div>
      </div>
    </Link>
  )
}

export default function PatientTriageList({ flagged, stable }: PatientTriageListProps) {
  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display-semi text-sectionTitle text-dialogue-text">Flagged</h2>
          {flagged.length > 0 && (
            <span className="bg-dialogue-accent text-dialogue-bg text-xs font-body-bold px-2 py-0.5 rounded-chip">
              {flagged.length}
            </span>
          )}
        </div>
        {flagged.length === 0 ? (
          <p className="text-dialogue-textMuted font-body text-sm">No flagged patients.</p>
        ) : (
          <div className="space-y-3">
            {flagged.map((item) => (
              <PatientRow key={item.submission.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display-semi text-sectionTitle text-dialogue-text mb-3">Stable</h2>
        {stable.length === 0 ? (
          <p className="text-dialogue-textMuted font-body text-sm">No stable patients.</p>
        ) : (
          <div className="space-y-3">
            {stable.map((item) => (
              <PatientRow key={item.submission.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
