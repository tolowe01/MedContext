import type { QuestionnaireHealth, Sexe } from '@/lib/types'

// ---------------------------------------------------------------------------
// LEGACY (v1.0) — kept for backward compatibility with the pharmacist patient
// detail page and existing tests. New onboarding uses the wizard below (v2.0).
// ---------------------------------------------------------------------------

export const QUESTIONNAIRE_SCHEMA_VERSION = 'v1.0'

export const questionnaireSchema = [
  { id: 'prescription_meds', label: 'Current prescription medications', kind: 'textarea' },
  { id: 'other_meds', label: 'OTC meds, supplements, meds from other pharmacies', kind: 'textarea' },
  { id: 'allergies', label: 'Known allergies', kind: 'textarea' },
  {
    id: 'smoking',
    label: 'Smoking',
    kind: 'select',
    options: ['none', 'cigarettes', 'cannabis', 'both'],
  },
  {
    id: 'alcohol',
    label: 'Alcohol consumption',
    kind: 'select',
    options: ['none', 'occasional', 'weekly', 'daily'],
  },
  {
    id: 'pregnancy',
    label: 'Pregnancy or breastfeeding',
    kind: 'select',
    options: ['yes', 'no', 'not_applicable'],
  },
  {
    id: 'family_cvd',
    label: 'Family history of cardiovascular disease',
    kind: 'select',
    options: ['yes', 'no', 'unsure'],
  },
  { id: 'past_medical', label: 'Past medical history', kind: 'textarea' },
] as const

// ---------------------------------------------------------------------------
// CURRENT (v2.0) — step-by-step onboarding wizard.
// ---------------------------------------------------------------------------

export const BASELINE_SCHEMA_VERSION = 'v2.0'

export type StepKind = 'yesno' | 'number' | 'slider' | 'date' | 'text'

/** Working answers for the wizard, keyed by step id. */
export interface WizardAnswers {
  allergies_has?: boolean
  allergies_details?: string
  weight?: string
  height?: string
  weight_change?: number
  pregnant?: boolean
  due_date?: string
  breastfeeding?: boolean
  other_meds?: boolean
  other_meds_details?: string
  health_changes?: boolean
  health_changes_details?: string
}

export interface SliderConfig {
  min: number
  max: number
  step: number
  unit: string
  minLabel: string
  midLabel: string
  maxLabel: string
}

export interface QuestionnaireStep {
  id: keyof WizardAnswers
  kind: StepKind
  question: string
  helper?: string
  /** number inputs */
  unit?: string
  placeholder?: string
  min?: number
  max?: number
  /** slider inputs */
  slider?: SliderConfig
  /** text inputs that may be left blank */
  optional?: boolean
  /** When present, the step only shows if this returns true. */
  visible?: (a: WizardAnswers, sexe: Sexe) => boolean
}

const womanLike = (sexe: Sexe) => sexe === 'female' || sexe === 'intersex'

export const WEIGHT_CHANGE_SLIDER: SliderConfig = {
  min: -15,
  max: 15,
  step: 0.5,
  unit: 'kg',
  minLabel: 'Lost weight',
  midLabel: 'No change',
  maxLabel: 'Gained weight',
}

/**
 * Ordered list of questionnaire steps. The wizard renders one at a time and
 * filters by each step's `visible()` predicate so follow-up questions only
 * appear when relevant (e.g. allergy details only after answering "yes").
 */
export const QUESTIONNAIRE_STEPS: QuestionnaireStep[] = [
  {
    id: 'allergies_has',
    kind: 'yesno',
    question: 'Do you have any allergies?',
  },
  {
    id: 'allergies_details',
    kind: 'text',
    question: 'What are you allergic to?',
    helper: 'List medications, foods, or anything else.',
    placeholder: 'e.g. penicillin, peanuts',
    visible: (a) => a.allergies_has === true,
  },
  {
    id: 'weight',
    kind: 'number',
    question: "What's your current weight?",
    unit: 'kg',
    placeholder: 'e.g. 72',
    min: 20,
    max: 400,
  },
  {
    id: 'height',
    kind: 'number',
    question: "What's your height?",
    unit: 'cm',
    placeholder: 'e.g. 168',
    min: 50,
    max: 250,
  },
  {
    id: 'weight_change',
    kind: 'slider',
    question: 'How has your weight changed since your last visit?',
    helper: 'Drag to estimate. Leave at the centre if it hasn’t changed.',
    slider: WEIGHT_CHANGE_SLIDER,
  },
  {
    id: 'pregnant',
    kind: 'yesno',
    question: 'Are you currently pregnant?',
    visible: (_a, sexe) => womanLike(sexe),
  },
  {
    id: 'due_date',
    kind: 'date',
    question: 'When are you expecting?',
    helper: 'Your estimated due date.',
    visible: (a, sexe) => womanLike(sexe) && a.pregnant === true,
  },
  {
    id: 'breastfeeding',
    kind: 'yesno',
    question: 'Are you currently breastfeeding?',
    visible: (_a, sexe) => womanLike(sexe),
  },
  {
    id: 'other_meds',
    kind: 'yesno',
    question: 'Are you taking any other medication?',
    helper: 'Include anything from other pharmacies, over-the-counter meds, or supplements.',
  },
  {
    id: 'other_meds_details',
    kind: 'text',
    question: 'Which other medications?',
    placeholder: 'e.g. vitamin D, ibuprofen',
    visible: (a) => a.other_meds === true,
  },
  {
    id: 'health_changes',
    kind: 'yesno',
    question: 'Any changes to your health since your last pharmacy visit?',
  },
  {
    id: 'health_changes_details',
    kind: 'text',
    question: 'What changed?',
    placeholder: 'Briefly describe what’s different.',
    visible: (a) => a.health_changes === true,
  },
]

/** Convert the wizard's working answers into the persisted health payload. */
export function buildHealthPayload(a: WizardAnswers, sexe: Sexe): QuestionnaireHealth {
  const pregnancyApplicable = womanLike(sexe)
  return {
    allergies: {
      has: a.allergies_has === true,
      details: a.allergies_has === true ? a.allergies_details?.trim() || null : null,
    },
    weight_kg: a.weight ? Number(a.weight) : null,
    height_cm: a.height ? Number(a.height) : null,
    weight_change_kg: a.weight_change ?? 0,
    pregnancy: {
      applicable: pregnancyApplicable,
      is_pregnant: pregnancyApplicable ? a.pregnant === true : null,
      due_date:
        pregnancyApplicable && a.pregnant === true ? a.due_date || null : null,
      breastfeeding: pregnancyApplicable ? a.breastfeeding === true : null,
    },
    other_medications: {
      taking: a.other_meds === true,
      details: a.other_meds === true ? a.other_meds_details?.trim() || null : null,
    },
    health_changes: {
      changed: a.health_changes === true,
      details:
        a.health_changes === true ? a.health_changes_details?.trim() || null : null,
    },
  }
}
