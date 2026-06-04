import { describe, it, expect } from 'vitest'
import { flagSubmission, highestSeverity } from '@/lib/flags'
import type { DailyLog, Flag } from '@/lib/types'

function makeLog(overrides: Partial<DailyLog>): DailyLog {
  return {
    id: 'log-1',
    patient_id: 'patient-1',
    log_date: '2024-01-01',
    systolic: 120,
    diastolic: 80,
    heart_rate: 70,
    adherence_taken: true,
    symptom_note: null,
    entered_via: 'text',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeLogs(count: number, overrides: Partial<DailyLog> = {}): DailyLog[] {
  return Array.from({ length: count }, (_, i) =>
    makeLog({ id: `log-${i}`, log_date: `2024-01-0${i + 1}`, ...overrides })
  )
}

describe('flagSubmission', () => {
  it('returns no flags for an empty array', () => {
    expect(flagSubmission([])).toEqual([])
  })

  it('returns no flags for healthy week (below thresholds, full adherence, 7 days)', () => {
    const logs = makeLogs(7, { systolic: 130, diastolic: 82, adherence_taken: true })
    expect(flagSubmission(logs)).toEqual([])
  })

  it('flags bp_avg medium when average systolic exceeds 140', () => {
    const logs = makeLogs(7, { systolic: 142, diastolic: 85 })
    const flags = flagSubmission(logs)
    expect(flags).toContainEqual<Flag>({ kind: 'bp_avg', severity: 'medium' })
  })

  it('flags bp_avg medium when average diastolic exceeds 90', () => {
    const logs = makeLogs(7, { systolic: 130, diastolic: 92 })
    const flags = flagSubmission(logs)
    expect(flags).toContainEqual<Flag>({ kind: 'bp_avg', severity: 'medium' })
  })

  it('flags bp_peak high when a single reading exceeds 160/100', () => {
    const logs = makeLogs(7, { systolic: 130, diastolic: 80 })
    const withPeak = [...logs.slice(1), makeLog({ id: 'peak', systolic: 165, diastolic: 85 })]
    const flags = flagSubmission(withPeak)
    expect(flags).toContainEqual<Flag>({ kind: 'bp_peak', severity: 'high' })
  })

  it('flags adherence medium when adherence rate below 80%', () => {
    // 2 of 7 taken = 28%
    const logs = makeLogs(7, { adherence_taken: false }).map((l, i) =>
      i < 2 ? { ...l, adherence_taken: true } : l
    )
    const flags = flagSubmission(logs)
    expect(flags).toContainEqual<Flag>({ kind: 'adherence', severity: 'medium' })
  })

  it('flags missing_data low when more than one day is missing', () => {
    const logs = makeLogs(5, { systolic: 130, diastolic: 80 })
    const flags = flagSubmission(logs)
    expect(flags).toContainEqual<Flag>({ kind: 'missing_data', severity: 'low' })
  })

  it('returns multiple flags when high average and non-adherent', () => {
    const logs = makeLogs(7, { systolic: 145, diastolic: 92, adherence_taken: false })
    const flags = flagSubmission(logs)
    expect(flags).toContainEqual<Flag>({ kind: 'bp_avg', severity: 'medium' })
    expect(flags).toContainEqual<Flag>({ kind: 'adherence', severity: 'medium' })
    expect(flags.length).toBeGreaterThanOrEqual(2)
  })
})

describe('highestSeverity', () => {
  it('returns none for empty flags', () => {
    expect(highestSeverity([])).toBe('none')
  })

  it('returns medium for a single medium flag', () => {
    expect(highestSeverity([{ kind: 'bp_avg', severity: 'medium' }])).toBe('medium')
  })

  it('returns high when any flag is high', () => {
    const flags: Flag[] = [
      { kind: 'missing_data', severity: 'low' },
      { kind: 'bp_peak', severity: 'high' },
    ]
    expect(highestSeverity(flags)).toBe('high')
  })

  it('returns low when only low flags present', () => {
    expect(highestSeverity([{ kind: 'missing_data', severity: 'low' }])).toBe('low')
  })
})
