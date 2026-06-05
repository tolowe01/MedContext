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
  criticalPatientIds?: string[]
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
  high: 'bg-red-600 text-white text-xs px-2 py-0.5 rounded-ln-sm font-ln-text font-semibold',
  medium: 'bg-ln-primary text-ln-canvas text-xs px-2 py-0.5 rounded-ln-sm font-ln-text font-semibold',
  low: 'bg-ln-surface2 text-ln-inkMuted text-xs px-2 py-0.5 rounded-ln-sm font-ln-text',
}

const FLAG_LABELS: Record<string, string> = {
  bp_avg: 'BP avg ↑',
  bp_peak: 'BP peak ↑',
  adherence: 'Low adherence',
  missing_data: 'Missing data',
}

function PatientRow({
  item,
  isCritical = false,
}: {
  item: SubmissionWithPatientSummary
  isCritical?: boolean
}) {
  const { submission, patient, logs, flags } = item
  const { profile } = patient
  const age = getAge(patient.date_of_birth)
  const name = `${profile.first_name} ${profile.last_name}`
  const submittedAgo = formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })

  return (
    <Link
      href={`/patient/${patient.id}`}
      className="block rounded-ln-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ln-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ln-canvas"
    >
      <div
        className={`bg-ln-surface1 rounded-ln-lg p-4 flex items-center gap-4 hover:bg-ln-hairline transition-colors cursor-pointer ${
          isCritical ? 'animate-pulse-border' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-ln-text font-semibold text-cta text-ln-ink truncate">
              {name}, {age}
            </p>
            {isCritical && (
              <span className="bg-emergency text-white text-xs px-2 py-0.5 rounded-ln-sm font-ln-text font-semibold shrink-0">
                CRITICAL
              </span>
            )}
          </div>
          <p className="font-ln-text text-sm text-ln-inkMuted mt-0.5">{submittedAgo}</p>
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

export default function PatientTriageList({
  flagged,
  stable,
  criticalPatientIds = [],
}: PatientTriageListProps) {
  const criticalIdSet = new Set(criticalPatientIds)
  const isCriticalItem = (item: SubmissionWithPatientSummary): boolean =>
    criticalIdSet.has(item.patient.id)

  // Pin critical patients to the top of the Flagged section without mutating
  // the incoming array. Stable React keys keep ordering deterministic.
  const sortedFlagged =
    criticalIdSet.size === 0
      ? flagged
      : [...flagged].sort((a, b) => {
          const aCritical = isCriticalItem(a) ? 1 : 0
          const bCritical = isCriticalItem(b) ? 1 : 0
          return bCritical - aCritical
        })

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-ln-display font-semibold text-sectionTitle text-ln-ink">Flagged</h2>
          {sortedFlagged.length > 0 && (
            <span className="bg-ln-primary text-ln-canvas text-xs font-ln-text font-semibold px-2 py-0.5 rounded-ln-sm">
              {sortedFlagged.length}
            </span>
          )}
        </div>
        {sortedFlagged.length === 0 ? (
          <p className="text-ln-inkMuted font-ln-text text-sm">No flagged patients.</p>
        ) : (
          <div className="space-y-3">
            {sortedFlagged.map((item) => (
              <PatientRow
                key={item.submission.id}
                item={item}
                isCritical={isCriticalItem(item)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-ln-display font-semibold text-sectionTitle text-ln-ink mb-3">Stable</h2>
        {stable.length === 0 ? (
          <p className="text-ln-inkMuted font-ln-text text-sm">No stable patients.</p>
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
