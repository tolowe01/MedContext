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
  high: 'bg-mc-danger-400 text-white text-xs px-2 py-0.5 rounded-chip font-body font-semibold',
  medium: 'bg-mc-warning-400 text-white text-xs px-2 py-0.5 rounded-chip font-body font-semibold',
  low: 'bg-mc-caution-400 text-white text-xs px-2 py-0.5 rounded-chip font-body font-semibold',
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
  const name = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed Patient'
    : 'Unknown Patient'
  const submittedAgo = formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })

  return (
    <Link
      href={`/patient/${patient.id}`}
      className="block rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-primary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-mc-surface-page"
    >
      <div
        className={`bg-mc-surface-white rounded-tile p-4 flex items-center gap-4 hover:bg-mc-neutral-100 transition-colors cursor-pointer ${
          isCritical ? 'animate-pulse-border' : ''
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-body font-semibold text-cta text-mc-neutral-900 truncate">
              {name}, {age}
            </p>
            {isCritical && (
              <span className="bg-emergency text-white text-xs px-2 py-0.5 rounded-chip font-body font-semibold shrink-0">
                CRITICAL
              </span>
            )}
          </div>
          <p className="font-body text-sm text-mc-neutral-600 mt-0.5">{submittedAgo}</p>
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
          <h2 className="font-display font-semibold text-sectionTitle text-mc-neutral-900">Flagged</h2>
          {sortedFlagged.length > 0 && (
            <span className="bg-mc-primary-400 text-white text-xs font-body font-semibold px-2 py-0.5 rounded-chip">
              {sortedFlagged.length}
            </span>
          )}
        </div>
        {sortedFlagged.length === 0 ? (
          <p className="text-mc-neutral-600 font-body text-sm">No flagged patients.</p>
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
        <h2 className="font-display font-semibold text-sectionTitle text-mc-neutral-900 mb-3">Stable</h2>
        {stable.length === 0 ? (
          <p className="text-mc-neutral-600 font-body text-sm">No stable patients.</p>
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
