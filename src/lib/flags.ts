import type { DailyLog } from '@/lib/types'

export type FlagKind = 'bp_avg' | 'bp_peak' | 'adherence' | 'missing_data'
export type FlagSeverity = 'low' | 'medium' | 'high'

export interface Flag {
  kind: FlagKind
  severity: FlagSeverity
}

const EXPECTED_DAYS = 7
const SYSTOLIC_AVG_THRESHOLD = 140
const DIASTOLIC_AVG_THRESHOLD = 90
const SYSTOLIC_PEAK_THRESHOLD = 160
const DIASTOLIC_PEAK_THRESHOLD = 100
const ADHERENCE_LOW_THRESHOLD = 0.5
const MISSING_DATA_THRESHOLD = EXPECTED_DAYS - 1

export function flagSubmission(logs: DailyLog[]): Flag[] {
  if (logs.length === 0) return []

  const flags: Flag[] = []

  // Check missing data
  if (logs.length < MISSING_DATA_THRESHOLD) {
    flags.push({ kind: 'missing_data', severity: 'low' })
  }

  // Check average BP
  const avgSystolic = logs.reduce((sum, l) => sum + l.systolic, 0) / logs.length
  const avgDiastolic = logs.reduce((sum, l) => sum + l.diastolic, 0) / logs.length

  if (avgSystolic > SYSTOLIC_AVG_THRESHOLD || avgDiastolic > DIASTOLIC_AVG_THRESHOLD) {
    flags.push({ kind: 'bp_avg', severity: 'medium' })
  }

  // Check peak BP
  const hasPeak = logs.some(
    (l) => l.systolic >= SYSTOLIC_PEAK_THRESHOLD || l.diastolic >= DIASTOLIC_PEAK_THRESHOLD
  )
  if (hasPeak) {
    flags.push({ kind: 'bp_peak', severity: 'high' })
  }

  // Check adherence
  const taken = logs.filter((l) => l.adherence_taken).length
  const adherenceRate = taken / logs.length

  if (adherenceRate < ADHERENCE_LOW_THRESHOLD) {
    flags.push({ kind: 'adherence', severity: 'medium' })
  }

  return flags
}

export type HighestSeverity = 'none' | FlagSeverity

export function highestSeverity(flags: Flag[]): HighestSeverity {
  if (flags.length === 0) return 'none'

  const order: Record<FlagSeverity, number> = { low: 1, medium: 2, high: 3 }
  const max = flags.reduce((best, f) => (order[f.severity] > order[best.severity] ? f : best))
  return max.severity
}
