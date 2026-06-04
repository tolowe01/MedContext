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
