export type UserRole = 'patient' | 'pharmacist'
export type SubmissionStatus = 'submitted' | 'reviewed' | 'follow_up'
export type InterventionKind = 'approval' | 'phone_call' | 'in_person' | 'clinical_note'

export type Sexe = 'female' | 'male' | 'intersex' | 'prefer_not_to_say'

/** Contact / identity fields captured during signup (stored in JSONB). */
export interface QuestionnaireContact {
  sexe: Sexe
  phone: string
  address: string
}

/** Health answers captured by the onboarding questionnaire wizard. */
export interface QuestionnaireHealth {
  allergies: { has: boolean; details: string | null }
  weight_kg: number | null
  height_cm: number | null
  /** Signed change in kg since the last pharmacy visit (from the slider). */
  weight_change_kg: number
  pregnancy: {
    applicable: boolean
    is_pregnant: boolean | null
    due_date: string | null
    breastfeeding: boolean | null
  }
  other_medications: { taking: boolean; details: string | null }
  health_changes: { changed: boolean; details: string | null }
}

/**
 * Shape of `patients.baseline_questionnaire` (JSONB).
 * `contact` is written at signup; `health` is merged in by the wizard.
 */
export interface BaselineQuestionnaire {
  schema_version: string
  contact: QuestionnaireContact
  health?: QuestionnaireHealth
}

export interface Profile {
  id: string
  role: 'patient' | 'pharmacist'
  pharmacy_id: string | null
  first_name: string
  last_name: string
  created_at: string
}

export interface Patient {
  id: string
  profile_id: string
  pharmacy_id: string
  date_of_birth: string
  access_code: string
  diagnosis: string
  // Legacy flat shape is preserved for the pharmacist detail page; new
  // onboarding writes the richer `BaselineQuestionnaire` shape (see below),
  // read back via an explicit cast where needed.
  baseline_questionnaire: Record<string, string> | null
  questionnaire_schema_version: string
  created_at: string
}

export interface DailyLog {
  id: string
  patient_id: string
  log_date: string
  systolic: number
  diastolic: number
  heart_rate: number | null
  adherence_taken: boolean
  symptom_note: string | null
  entered_via: 'text' | 'voice'
  created_at: string
}

export interface PharmacistVerifiedReading {
  id: string
  patient_id: string
  pharmacist_id: string
  reading_date: string
  systolic: number
  diastolic: number
  recorded_at: string
}

export interface WeeklySubmission {
  id: string
  patient_id: string
  week_start: string
  ai_synthesis_text: string | null
  ai_synthesis_edited_text: string | null
  status: SubmissionStatus
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export interface Intervention {
  id: string
  submission_id: string
  kind: InterventionKind
  payload: {
    phone_time?: string
    note_text?: string
    appointment_date?: string
    message?: string
  } | null
  created_at: string
}

export interface LogReadingInput {
  systolic: number
  diastolic: number
  heart_rate?: number
  adherence_taken: boolean
  symptom_note?: string
}

export interface ConsentRecord {
  id: string
  patient_id: string
  consented_at: string
  consent_version: string
  purposes: string[]
  pdf_url: string | null
  ip_address: string | null
}

export interface Flag {
  kind: 'bp_avg' | 'bp_peak' | 'adherence' | 'missing_data'
  severity: 'low' | 'medium' | 'high'
}

export interface PatientWithProfile {
  patient: Patient
  profile: Profile
}

export interface SubmissionWithPatientSummary {
  submission: WeeklySubmission
  patient: Patient & { profile: Profile }
  logs: DailyLog[]
  flags: Flag[]
}
