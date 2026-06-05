import { describe, it, expect } from 'vitest'
import { flagSubmission, highestSeverity } from '@/lib/flags'
import type { DailyLog } from '@/lib/types'

/**
 * Integration test: the exact 6-day seed for Sophie Tremblay (the demo patient)
 * must produce the flags the pitch relies on. If seed values drift, the demo
 * narrative ("the missed dose midweek, the high average") breaks.
 */
function seedLog(partial: Pick<DailyLog, 'log_date' | 'systolic' | 'diastolic' | 'adherence_taken' | 'symptom_note'>): DailyLog {
  return {
    id: partial.log_date,
    patient_id: 'sophie',
    heart_rate: null,
    entered_via: 'text',
    created_at: `${partial.log_date}T20:00:00Z`,
    monitoring_period_id: null,
    logged_at_local: null,
    adherence_skip_reason: null,
    is_critical: false,
    ...partial,
  }
}

const SOPHIE_SEED: DailyLog[] = [
  seedLog({ log_date: '2026-05-30', systolic: 135, diastolic: 85, adherence_taken: true, symptom_note: null }),
  seedLog({ log_date: '2026-05-31', systolic: 138, diastolic: 87, adherence_taken: true, symptom_note: null }),
  seedLog({ log_date: '2026-06-01', systolic: 142, diastolic: 90, adherence_taken: true, symptom_note: null }),
  seedLog({ log_date: '2026-06-02', systolic: 148, diastolic: 94, adherence_taken: false, symptom_note: 'felt dizzy' }),
  seedLog({ log_date: '2026-06-03', systolic: 144, diastolic: 91, adherence_taken: true, symptom_note: null }),
  seedLog({ log_date: '2026-06-04', systolic: 146, diastolic: 93, adherence_taken: true, symptom_note: null }),
]

describe("Sophie Tremblay seed → flag narrative", () => {
  const flags = flagSubmission(SOPHIE_SEED)
  const kinds = flags.map((f) => f.kind)

  it('flags high average BP (avg systolic > 140)', () => {
    const avgSys = SOPHIE_SEED.reduce((s, l) => s + l.systolic, 0) / SOPHIE_SEED.length
    expect(avgSys).toBeGreaterThan(140)
    expect(kinds).toContain('bp_avg')
  })

  it('does NOT flag missing data (6 days = exactly 1 missing, threshold is > 1)', () => {
    expect(SOPHIE_SEED).toHaveLength(6)
    expect(kinds).not.toContain('missing_data')
  })

  it('flags ONLY on high average BP for the demo week', () => {
    expect(kinds).toEqual(['bp_avg'])
  })

  it('does NOT flag adherence (one missed dose = 83% > 80% threshold)', () => {
    const rate = SOPHIE_SEED.filter((l) => l.adherence_taken).length / SOPHIE_SEED.length
    expect(rate).toBeCloseTo(0.833, 2)
    expect(kinds).not.toContain('adherence')
  })

  it('does NOT flag a single-reading peak (no reading > 160/100)', () => {
    expect(kinds).not.toContain('bp_peak')
  })

  it('overall severity surfaces the patient as flagged (medium)', () => {
    expect(highestSeverity(flags)).toBe('medium')
    expect(flags.length).toBeGreaterThan(0)
  })

  it('preserves the dizzy symptom note for pharmacist review', () => {
    const dizzy = SOPHIE_SEED.find((l) => l.symptom_note === 'felt dizzy')
    expect(dizzy).toBeDefined()
    expect(dizzy?.adherence_taken).toBe(false)
  })
})

describe('flagSubmission does not mutate input', () => {
  it('returns a new array and leaves logs untouched', () => {
    const snapshot = JSON.stringify(SOPHIE_SEED)
    flagSubmission(SOPHIE_SEED)
    expect(JSON.stringify(SOPHIE_SEED)).toBe(snapshot)
  })
})
