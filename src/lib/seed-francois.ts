import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { subDays, format } from 'date-fns'

// =====================================================================
// MedX demo seed — Francois Legault (escalation-ready patient).
//
// Seeds a SECOND demo patient in the same pharmacy as the main seed
// (pharmacist@demo / Sarah Chen) so two patients show in triage. Francois is a
// 70-year-old whose 7-day week sits steadily around 160/95 with a heart rate
// near 80 — elevated enough to flag HIGH (peak >= 160) but below the critical
// trigger (> 180 / > 120), so it never auto-fires. The pharmacist escalates the
// flow manually during the demo.
//
// Idempotent: child rows for Francois are deleted before insert; auth user,
// profiles, and patient record use upsert / "already registered" handling, so
// re-running is safe. Does NOT touch the main (Sophie) seed.
//
// Run: npm run seed:francois
// =====================================================================

const PHARMACY_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_PASSWORD = 'demo1234'

// Canned, non-evaluative 7-day data summary. Data only — no diagnosis, no advice.
const AI_SYNTHESIS_TEXT = [
  'Over the past 7 days Francois recorded a blood pressure reading on all 7 days,',
  'with an average of 160 over 95 mmHg. Readings ranged from 158 over 93 to 163',
  'over 97, and heart rate averaged 80 bpm. Medication was reported as taken on',
  'all 7 logged days, for an adherence rate of 100 percent. No side effects were',
  'reported. This summary reports the logged data only and contains no clinical',
  'assessment.',
].join(' ')

// =====================================================================
// Demo auth users. The pharmacist and physician mirror the main seed so FK
// references resolve even if this script runs on its own.
// =====================================================================
interface DemoUser {
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly role: 'patient' | 'pharmacist' | 'physician'
  readonly pharmacyId: string | null
}

const FRANCOIS: DemoUser = {
  email: 'francois@demo',
  firstName: 'Francois',
  lastName: 'Legault',
  role: 'patient',
  pharmacyId: PHARMACY_ID,
}

const SUPPORTING_USERS: readonly DemoUser[] = [
  { email: 'pharmacist@demo', firstName: 'Sarah', lastName: 'Chen', role: 'pharmacist', pharmacyId: PHARMACY_ID },
  { email: 'physician@demo', firstName: 'Marc', lastName: 'Lavoie', role: 'physician', pharmacyId: null },
] as const

const ALL_USERS: readonly DemoUser[] = [FRANCOIS, ...SUPPORTING_USERS] as const

// =====================================================================
// Medication list. Ramipril is the NEW-flagged medication that gives the
// pharmacist a concrete reason to escalate (recent add + persistently high BP).
// =====================================================================
interface SeedMedication {
  readonly name: string
  readonly dose: string
  readonly frequency: string
  readonly isNew: boolean
}

const MEDICATIONS: readonly SeedMedication[] = [
  { name: 'Amlodipine', dose: '10 mg', frequency: 'once daily, morning', isNew: false },
  { name: 'Hydrochlorothiazide', dose: '25 mg', frequency: 'once daily, morning', isNew: false },
  { name: 'Ramipril', dose: '10 mg', frequency: 'once daily, evening', isNew: true },
] as const

const PRESCRIBING_PHYSICIAN_NAME = 'Marc Lavoie'

// =====================================================================
// 7-day daily-log trajectory. Steady ~160/95, HR ~80, fully adherent. None of
// these trip the > 180 / > 120 critical threshold owned by the daily_logs
// trigger, so is_critical stays false and no alert fires.
// =====================================================================
interface SeedDailyLog {
  readonly daysAgo: number
  readonly systolic: number
  readonly diastolic: number
  readonly heartRate: number
  readonly adherenceTaken: boolean
  readonly loggedAtLocal: string
}

const DAILY_LOGS: readonly SeedDailyLog[] = [
  { daysAgo: 6, systolic: 162, diastolic: 96, heartRate: 79, adherenceTaken: true, loggedAtLocal: '08:12' },
  { daysAgo: 5, systolic: 159, diastolic: 94, heartRate: 81, adherenceTaken: true, loggedAtLocal: '08:05' },
  { daysAgo: 4, systolic: 161, diastolic: 95, heartRate: 80, adherenceTaken: true, loggedAtLocal: '08:20' },
  { daysAgo: 3, systolic: 158, diastolic: 93, heartRate: 78, adherenceTaken: true, loggedAtLocal: '08:01' },
  { daysAgo: 2, systolic: 163, diastolic: 97, heartRate: 82, adherenceTaken: true, loggedAtLocal: '08:15' },
  { daysAgo: 1, systolic: 160, diastolic: 95, heartRate: 80, adherenceTaken: true, loggedAtLocal: '08:08' },
  { daysAgo: 0, systolic: 161, diastolic: 96, heartRate: 81, adherenceTaken: true, loggedAtLocal: '08:10' },
] as const

// =====================================================================
// Helpers
// =====================================================================
function dateDaysAgo(daysAgo: number): string {
  return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd')
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const e = error as { message?: string; details?: string; hint?: string; code?: string }
    if (e.message) {
      return [e.message, e.code && `(code ${e.code})`, e.details, e.hint]
        .filter(Boolean)
        .join(' ')
    }
    try {
      return JSON.stringify(error)
    } catch {
      return 'Unexpected error'
    }
  }
  return 'Unexpected error'
}

/** Throw with a clear, prefixed message. Used for failures that must halt seeding. */
function fail(context: string, error: unknown): never {
  throw new Error(`${context}: ${getErrorMessage(error)}`)
}

function requireServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
    console.error(
      'Cannot seed: real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local'
    )
    process.exit(1)
  }

  return createClient(url, serviceKey)
}

/**
 * Create a demo auth user if it does not already exist, then resolve its id.
 * Treats "already registered" as success and falls back to listUsers().
 */
async function ensureAuthUser(supabase: SupabaseClient, user: DemoUser): Promise<string> {
  console.log(`Ensuring auth user: ${user.email}`)
  const { error: createError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  if (createError && !createError.message.toLowerCase().includes('already')) {
    fail(`Auth user create failed for ${user.email}`, createError)
  }

  const { data, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) fail(`Could not list auth users to resolve ${user.email}`, listError)

  const found = data?.users?.find((u) => u.email === user.email)?.id
  if (!found) throw new Error(`Could not resolve id for ${user.email} after creation`)
  return found
}

async function ensureProfiles(
  supabase: SupabaseClient,
  idByEmail: Record<string, string>
): Promise<void> {
  console.log('Upserting profiles...')
  const rows = ALL_USERS.map((u) => ({
    id: idByEmail[u.email],
    role: u.role,
    pharmacy_id: u.pharmacyId,
    first_name: u.firstName,
    last_name: u.lastName,
  }))

  const { error } = await supabase.from('profiles').upsert(rows, { onConflict: 'id' })
  if (error) fail('Profile upsert failed', error)
}

async function ensurePatient(supabase: SupabaseClient, patientProfileId: string): Promise<string> {
  console.log('Upserting patient record (Francois Legault, 70)...')
  const { data, error } = await supabase
    .from('patients')
    .upsert(
      {
        profile_id: patientProfileId,
        pharmacy_id: PHARMACY_ID,
        // 70 years old as of the 2026 demo window.
        date_of_birth: '1956-01-01',
        access_code: 'DEMO02',
        diagnosis: 'Hypertension',
        // Minimal completed baseline so the patient flow does not bounce to onboarding.
        baseline_questionnaire: { health: { conditions: ['hypertension'] } },
      },
      { onConflict: 'profile_id' }
    )
    .select('id')
    .single()

  if (error || !data) fail('Patient record upsert failed', error)
  return data.id
}

/**
 * Delete Francois's child rows so re-running the seed is safe. Ordered to respect
 * FK dependencies (side_effects / critical_alerts cascade from daily_logs;
 * monitoring_periods are referenced by daily_logs so they go after).
 */
async function clearPatientChildRows(supabase: SupabaseClient, patientId: string): Promise<void> {
  console.log('Clearing prior demo data for Francois...')

  const tablesInOrder = [
    'daily_logs',
    'weekly_submissions',
    'pharmacist_verified_readings',
    'consultations',
    'physician_escalations',
    'monitoring_periods',
    'medication_lists',
  ] as const

  for (const table of tablesInOrder) {
    const { error } = await supabase.from(table).delete().eq('patient_id', patientId)
    if (error) fail(`Failed clearing ${table}`, error)
  }
}

async function seedMedicationList(
  supabase: SupabaseClient,
  patientId: string,
  pharmacistId: string,
  physicianId: string
): Promise<string> {
  console.log('Inserting confirmed medication list...')
  const { data: list, error: listError } = await supabase
    .from('medication_lists')
    .insert({
      patient_id: patientId,
      uploaded_by: pharmacistId,
      source_filename: 'francois-meds.pdf',
      source_storage_path: 'seed/francois-meds.pdf',
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (listError || !list) fail('Medication list insert failed', listError)

  console.log('Inserting medications...')
  const medicationRows = MEDICATIONS.map((med) => ({
    medication_list_id: list.id,
    name: med.name,
    dose: med.dose,
    frequency: med.frequency,
    is_new: med.isNew,
    prescribing_physician_id: physicianId,
    prescribing_physician_name: PRESCRIBING_PHYSICIAN_NAME,
  }))
  const { error: medsError } = await supabase.from('medications').insert(medicationRows)
  if (medsError) fail('Medications insert failed', medsError)

  return list.id
}

async function seedMonitoringPeriod(
  supabase: SupabaseClient,
  patientId: string,
  pharmacistId: string,
  medicationListId: string
): Promise<string> {
  // 'submitted' = the week is complete, so the pharmacist decision panel renders
  // on a finished 7-day period ready to approve / schedule / escalate.
  console.log('Inserting monitoring period (status: submitted)...')
  const { data, error } = await supabase
    .from('monitoring_periods')
    .insert({
      patient_id: patientId,
      pharmacist_id: pharmacistId,
      medication_list_id: medicationListId,
      preferred_log_time: '08:00',
      start_date: dateDaysAgo(7),
      expected_end_date: dateDaysAgo(0),
      status: 'submitted',
      ai_synthesis_text: AI_SYNTHESIS_TEXT,
    })
    .select('id')
    .single()

  if (error || !data) fail('Monitoring period insert failed', error)
  return data.id
}

async function seedWeeklySubmission(supabase: SupabaseClient, patientId: string): Promise<void> {
  console.log('Inserting weekly submission...')
  const { error } = await supabase.from('weekly_submissions').insert({
    patient_id: patientId,
    week_start: dateDaysAgo(7),
    ai_synthesis_text: AI_SYNTHESIS_TEXT,
    status: 'submitted',
  })
  if (error) fail('Weekly submission insert failed', error)
}

/** Insert the 7 daily logs. is_critical is never set manually; the trigger owns it. */
async function seedDailyLogs(
  supabase: SupabaseClient,
  patientId: string,
  monitoringPeriodId: string
): Promise<void> {
  console.log('Inserting 7 daily logs (~160/95, HR ~80, fully adherent)...')

  const rows = DAILY_LOGS.map((log) => ({
    patient_id: patientId,
    monitoring_period_id: monitoringPeriodId,
    log_date: dateDaysAgo(log.daysAgo),
    systolic: log.systolic,
    diastolic: log.diastolic,
    heart_rate: log.heartRate,
    adherence_taken: log.adherenceTaken,
    symptom_note: null,
    adherence_skip_reason: null,
    logged_at_local: log.loggedAtLocal,
    entered_via: 'text',
  }))

  const { error } = await supabase.from('daily_logs').insert(rows)
  if (error) fail('Daily logs insert failed', error)
}

async function seedVerifiedReading(
  supabase: SupabaseClient,
  patientId: string,
  pharmacistId: string
): Promise<void> {
  console.log('Inserting pharmacist verified reading...')
  const { error } = await supabase.from('pharmacist_verified_readings').insert({
    patient_id: patientId,
    pharmacist_id: pharmacistId,
    reading_date: dateDaysAgo(1),
    systolic: 161,
    diastolic: 96,
  })
  if (error) fail('Pharmacist verified reading insert failed', error)
}

// =====================================================================
// Orchestration
// =====================================================================
async function seed(): Promise<void> {
  const supabase = requireServiceClient()

  console.log('Seeding MedX demo patient: Francois Legault')

  // 1. Auth users + resolve ids.
  const idByEmail: Record<string, string> = {}
  for (const user of ALL_USERS) {
    idByEmail[user.email] = await ensureAuthUser(supabase, user)
  }

  // 2. Profiles.
  await ensureProfiles(supabase, idByEmail)

  // 3. Patient record.
  const patientRecordId = await ensurePatient(supabase, idByEmail[FRANCOIS.email])

  // Idempotency: clear prior child rows before re-inserting.
  await clearPatientChildRows(supabase, patientRecordId)

  // 4 + 5. Medication list and medications.
  const medicationListId = await seedMedicationList(
    supabase,
    patientRecordId,
    idByEmail['pharmacist@demo'],
    idByEmail['physician@demo']
  )

  // 6. Monitoring period (submitted).
  const monitoringPeriodId = await seedMonitoringPeriod(
    supabase,
    patientRecordId,
    idByEmail['pharmacist@demo'],
    medicationListId
  )

  // 7. Weekly submission (lights up the triage row + decision panel).
  await seedWeeklySubmission(supabase, patientRecordId)

  // 8. The 7 daily logs.
  await seedDailyLogs(supabase, patientRecordId, monitoringPeriodId)

  // 9. Pharmacist verified reading.
  await seedVerifiedReading(supabase, patientRecordId, idByEmail['pharmacist@demo'])

  console.log('')
  console.log('Seed complete')
  console.log('  francois@demo / demo1234    (Francois Legault, 70)')
  console.log('  Visible under pharmacist@demo / demo1234 (Sarah Chen)')
  console.log('  7 days @ ~160/95, HR ~80 — flags HIGH, ready to escalate')
}

seed().catch((err) => {
  console.error(getErrorMessage(err))
  process.exit(1)
})
