import type { SideEffectSeverity } from './types'

export type { SideEffectSeverity }

export interface SideEffectOption {
  code: string // stored in side_effects.effect_code
  label: string // patient-facing, no evaluative language, no em dash
  allowsSeverity: boolean
}

/**
 * Catalog of common, non-emergency side effects keyed by code, cross-referenced
 * to the seeded patient's antihypertensives. Severe / red-flag symptoms
 * (angioedema, chest pain, one-sided weakness) are deliberately NOT here: they
 * route to the emergency block in the check-in form, never to a stored checkbox.
 */
export const SIDE_EFFECT_OPTIONS: Record<string, SideEffectOption> = {
  ankle_swelling: { code: 'ankle_swelling', label: 'Swelling in my ankles or feet', allowsSeverity: true },
  dizziness: { code: 'dizziness', label: 'Dizziness or lightheadedness', allowsSeverity: true },
  dry_cough: { code: 'dry_cough', label: 'A dry cough', allowsSeverity: true },
  flushing: { code: 'flushing', label: 'Flushing or warmth in my face', allowsSeverity: true },
  frequent_urination: { code: 'frequent_urination', label: 'Urinating more often than usual', allowsSeverity: true },
  fatigue: { code: 'fatigue', label: 'Feeling more tired than usual', allowsSeverity: true },
  muscle_cramps: { code: 'muscle_cramps', label: 'Muscle cramps', allowsSeverity: true },
  headache: { code: 'headache', label: 'A headache', allowsSeverity: true },
  other: { code: 'other', label: 'Something else (describe below)', allowsSeverity: false },
}

export const SIDE_EFFECT_CODES = Object.keys(SIDE_EFFECT_OPTIONS) as [string, ...string[]]

/** Lowercased medication name -> drug class key. */
export const MED_CLASS_BY_NAME: Record<string, string> = {
  amlodipine: 'ccb',
  hydrochlorothiazide: 'thiazide',
  ramipril: 'acei',
}

const EFFECTS_BY_CLASS: Record<string, string[]> = {
  ccb: ['ankle_swelling', 'flushing', 'dizziness', 'headache'],
  thiazide: ['frequent_urination', 'dizziness', 'fatigue', 'muscle_cramps'],
  acei: ['dry_cough', 'dizziness', 'fatigue'],
}

/** Deduplicated union of side-effect options for a patient's medications. */
export function getSideEffectsForMeds(medNames: string[]): SideEffectOption[] {
  const codes = new Set<string>()
  for (const name of medNames) {
    const key = (name ?? '').toLowerCase().trim().split(/\s+/)[0]
    const cls = MED_CLASS_BY_NAME[key]
    if (cls) {
      for (const code of EFFECTS_BY_CLASS[cls] ?? []) codes.add(code)
    }
  }
  // Stable display order from the catalog, plus the always-present "other".
  const ordered = Object.keys(SIDE_EFFECT_OPTIONS).filter(
    (code) => code !== 'other' && codes.has(code)
  )
  return [...ordered, 'other'].map((code) => SIDE_EFFECT_OPTIONS[code])
}
