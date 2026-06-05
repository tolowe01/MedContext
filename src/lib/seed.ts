import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { subDays, format } from 'date-fns'

// =====================================================================
// MedX demo seed (pharmacist-initiated flow).
//
// Seeds the Sophie Tremblay narrative end to end: three auth users, their
// profiles, the confirmed medication list (with the NEW-flagged Ramipril that
// drives the escalation story), a submitted 7-day monitoring period, the paired
// weekly submission, the day-by-day BP trajectory with the mid-week dizziness
// event, and the in-store verified reading.
//
// Idempotent: child rows for the demo patient are deleted before insert, auth
// users / profiles / patient record use upsert or "already registered" handling,
// so re-running the seed is safe.
//
// Toggle SEED_VARIANT ('normal' | 'critical') controls the Day 0 reading. See
// the SeedVariant section and the console output for run instructions.
// =====================================================================

const PHARMACY_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_PASSWORD = 'demo1234'

// Canned, non-evaluative 7-day data summary. Reports averages, adherence, and
// the dizziness note as data only. No diagnosis, no dose advice, no judgement.
const AI_SYNTHESIS_TEXT = [
  'Over the past 7 days Sophie recorded a blood pressure reading on 6 of 7 days,',
  'with an average of 142 over 90 mmHg. Readings ranged from 135 over 85 to 148',
  'over 94. Medication was reported as taken on 5 of the 6 logged days, for an',
  'adherence rate of 83 percent. On the one day a dose was skipped, Sophie noted',
  'feeling dizzy and recorded the same as a side effect at moderate severity.',
  'This summary reports the logged data only and contains no clinical assessment.',
].join(' ')

// =====================================================================
// Demo auth users
// =====================================================================
interface DemoUser {
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly role: 'patient' | 'pharmacist' | 'physician'
  readonly pharmacyId: string | null
}

const DEMO_USERS: readonly DemoUser[] = [
  { email: 'patient@demo', firstName: 'Sophie', lastName: 'Tremblay', role: 'patient', pharmacyId: PHARMACY_ID },
  { email: 'pharmacist@demo', firstName: 'Sarah', lastName: 'Chen', role: 'pharmacist', pharmacyId: PHARMACY_ID },
  { email: 'physician@demo', firstName: 'Marc', lastName: 'Lavoie', role: 'physician', pharmacyId: null },
] as const

// =====================================================================
// Medication list (confirmed). HCTZ dose is intentionally 25 mg here, not the
// 12.5 mg in telus-meds; the plan calls for 25 mg in the demo. Ramipril is the
// NEW-flagged medication that drives the escalation narrative.
// =====================================================================
interface SeedMedication {
  readonly name: string
  readonly dose: string
  readonly frequency: string
  readonly isNew: boolean
}

const MEDICATIONS: readonly SeedMedication[] = [
  { name: 'Amlodipine', dose: '5 mg', frequency: 'once daily, morning', isNew: false },
  { name: 'Hydrochlorothiazide', dose: '25 mg', frequency: 'once daily, morning', isNew: false },
  { name: 'Ramipril', dose: '10 mg', frequency: 'once daily, evening', isNew: true },
] as const

const PRESCRIBING_PHYSICIAN_NAME = 'Marc Lavoie'

// =====================================================================
// Daily log trajectory (6 historical days). The trigger owns is_critical; none
// of these readings trip the > 180 / > 120 threshold, so it stays false.
// =====================================================================
interface SeedDailyLog {
  readonly daysAgo: number
  readonly systolic: number
  readonly diastolic: number
  readonly adherenceTaken: boolean
  readonly symptomNote: string | null
  readonly adherenceSkipReason: string | null
  readonly loggedAtLocal: string
}

const DAILY_LOGS: readonly SeedDailyLog[] = [
  { daysAgo: 6, systolic: 135, diastolic: 85, adherenceTaken: true, symptomNote: null, adherenceSkipReason: null, loggedAtLocal: '19:02' },
  { daysAgo: 5, systolic: 138, diastolic: 87, adherenceTaken: true, symptomNote: null, adherenceSkipReason: null, loggedAtLocal: '19:05' },
  { daysAgo: 4, systolic: 142, diastolic: 90, adherenceTaken: true, symptomNote: null, adherenceSkipReason: null, loggedAtLocal: '19:01' },
  { daysAgo: 3, systolic: 148, diastolic: 94, adherenceTaken: false, symptomNote: 'felt dizzy', adherenceSkipReason: 'felt dizzy', loggedAtLocal: '19:08' },
  { daysAgo: 2, systolic: 144, diastolic: 91, adherenceTaken: true, symptomNote: null, adherenceSkipReason: null, loggedAtLocal: '19:03' },
  { daysAgo: 1, systolic: 146, diastolic: 93, adherenceTaken: true, symptomNote: null, adherenceSkipReason: null, loggedAtLocal: '19:06' },
] as const

// The day whose log carries the structured dizziness side effect.
const DIZZINESS_DAYS_AGO = 3

// =====================================================================
// Demo toggle
// =====================================================================
type SeedVariant = 'normal' | 'critical'

function resolveSeedVariant(): SeedVariant {
  const fromEnv = process.env.SEED_VARIANT?.trim().toLowerCase()
  const lastArg = process.argv[process.argv.length - 1]?.trim().toLowerCase()
  const candidate = fromEnv || lastArg
  return candidate === 'critical' ? 'critical' : 'normal'
}

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

interface DemoUserIds {
  readonly patientId: string
  readonly pharmacistId: string
  readonly physicianId: string
}

async function ensureProfiles(supabase: SupabaseClient, ids: DemoUserIds): Promise<void> {
  console.log('Upserting profiles...')
  const idByEmail: Record<string, string> = {
    'patient@demo': ids.patientId,
    'pharmacist@demo': ids.pharmacistId,
    'physician@demo': ids.physicianId,
  }
  const rows = DEMO_USERS.map((u) => ({
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
  console.log('Upserting patient record...')
  const { data, error } = await supabase
    .from('patients')
    .upsert(
      {
        profile_id: patientProfileId,
        pharmacy_id: PHARMACY_ID,
        date_of_birth: '1966-01-01',
        access_code: 'DEMO01',
        diagnosis: 'Hypertension',
      },
      { onConflict: 'profile_id' }
    )
    .select('id')
    .single()

  if (error || !data) fail('Patient record upsert failed', error)
  return data.id
}

/**
 * Delete the demo patient's child rows so re-running the seed is safe.
 * Ordered to respect FK dependencies (side_effects and critical_alerts cascade
 * from daily_logs, but we clear daily_logs explicitly anyway). monitoring_periods
 * are deleted last because daily_logs reference them.
 */
async function clearPatientChildRows(supabase: SupabaseClient, patientId: string): Promise<void> {
  console.log('Clearing prior demo data for this patient...')

  const { error: logsError } = await supabase.from('daily_logs').delete().eq('patient_id', patientId)
  if (logsError) fail('Failed clearing daily_logs', logsError)

  const { error: submissionsError } = await supabase
    .from('weekly_submissions')
    .delete()
    .eq('patient_id', patientId)
  if (submissionsError) fail('Failed clearing weekly_submissions', submissionsError)

  const { error: verifiedError } = await supabase
    .from('pharmacist_verified_readings')
    .delete()
    .eq('patient_id', patientId)
  if (verifiedError) fail('Failed clearing pharmacist_verified_readings', verifiedError)

  const { error: periodsError } = await supabase
    .from('monitoring_periods')
    .delete()
    .eq('patient_id', patientId)
  if (periodsError) fail('Failed clearing monitoring_periods', periodsError)

  // medication_lists cascade their medications via FK on delete cascade.
  const { error: listsError } = await supabase
    .from('medication_lists')
    .delete()
    .eq('patient_id', patientId)
  if (listsError) fail('Failed clearing medication_lists', listsError)
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
      source_filename: 'sophie-meds.pdf',
      source_storage_path: 'seed/sophie-meds.pdf',
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
  medicationListId: string,
  variant: SeedVariant
): Promise<string> {
  // normal: the week is already done, status 'submitted' so the pharmacist
  // decision panel renders on a complete week.
  // critical: status 'active' so the patient can enter a live Day 0 reading,
  // and the daily_logs trigger can flip the period 'active' -> 'critical_alert'
  // (the trigger only flips an active period).
  const status = variant === 'critical' ? 'active' : 'submitted'
  console.log(`Inserting monitoring period (status: ${status})...`)
  const { data, error } = await supabase
    .from('monitoring_periods')
    .insert({
      patient_id: patientId,
      pharmacist_id: pharmacistId,
      medication_list_id: medicationListId,
      preferred_log_time: '19:00',
      start_date: dateDaysAgo(7),
      expected_end_date: dateDaysAgo(0),
      status,
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

/**
 * Insert the 6 historical daily logs. The dizziness-day log is inserted on its
 * own first so we can capture its id and attach the structured side effect.
 * is_critical is never set manually; the BEFORE trigger owns it.
 */
async function seedDailyLogsAndSideEffect(
  supabase: SupabaseClient,
  patientId: string,
  monitoringPeriodId: string
): Promise<void> {
  console.log('Inserting daily logs...')

  const buildRow = (log: SeedDailyLog) => ({
    patient_id: patientId,
    monitoring_period_id: monitoringPeriodId,
    log_date: dateDaysAgo(log.daysAgo),
    systolic: log.systolic,
    diastolic: log.diastolic,
    adherence_taken: log.adherenceTaken,
    symptom_note: log.symptomNote,
    adherence_skip_reason: log.adherenceSkipReason,
    logged_at_local: log.loggedAtLocal,
    entered_via: 'text',
  })

  const dizzinessLog = DAILY_LOGS.find((l) => l.daysAgo === DIZZINESS_DAYS_AGO)
  if (!dizzinessLog) throw new Error('Seed misconfigured: dizziness day not present in DAILY_LOGS')

  // Insert the dizziness-day log first to capture its id for the side effect.
  const { data: dizzyRow, error: dizzyError } = await supabase
    .from('daily_logs')
    .insert(buildRow(dizzinessLog))
    .select('id')
    .single()
  if (dizzyError || !dizzyRow) fail('Dizziness-day daily_log insert failed', dizzyError)

  // Insert the remaining logs in one batch.
  const otherRows = DAILY_LOGS.filter((l) => l.daysAgo !== DIZZINESS_DAYS_AGO).map(buildRow)
  const { error: othersError } = await supabase.from('daily_logs').insert(otherRows)
  if (othersError) fail('Historical daily_logs insert failed', othersError)

  console.log('Inserting structured side effect (dizziness, moderate)...')
  const { error: effectError } = await supabase.from('side_effects').insert({
    daily_log_id: dizzyRow.id,
    patient_id: patientId,
    monitoring_period_id: monitoringPeriodId,
    effect_code: 'dizziness',
    severity: 'moderate',
  })
  if (effectError) fail('Side effect insert failed', effectError)
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
    reading_date: dateDaysAgo(DIZZINESS_DAYS_AGO),
    systolic: 152,
    diastolic: 96,
  })
  if (error) fail('Pharmacist verified reading insert failed', error)
}

/**
 * Day 0 behaviour depends on the variant.
 * - normal: insert a calm Day 0 reading (~143/90, adherent). No alert fires.
 * - critical: insert nothing. The operator enters a live > 180/120 reading
 *   during the demo so the Realtime banner fires live. We never hand-insert a
 *   critical_alerts row; the daily_logs trigger owns alert creation.
 */
async function seedDayZero(
  supabase: SupabaseClient,
  patientId: string,
  monitoringPeriodId: string,
  variant: SeedVariant
): Promise<void> {
  if (variant === 'critical') {
    console.log('')
    console.log('SEED_VARIANT=critical: skipping the Day 0 reading on purpose.')
    console.log('During the demo, log a live reading of 185/122 as patient@demo so the')
    console.log('daily_logs trigger fires and the pharmacist Realtime critical banner')
    console.log('appears live. Do NOT pre-insert a critical_alerts row; the trigger owns it.')
    console.log('')
    return
  }

  console.log('SEED_VARIANT=normal: inserting calm Day 0 reading (143/90, adherent)...')
  const { error } = await supabase.from('daily_logs').insert({
    patient_id: patientId,
    monitoring_period_id: monitoringPeriodId,
    log_date: dateDaysAgo(0),
    systolic: 143,
    diastolic: 90,
    adherence_taken: true,
    symptom_note: null,
    adherence_skip_reason: null,
    logged_at_local: '19:04',
    entered_via: 'text',
  })
  if (error) fail('Day 0 daily_log insert failed', error)
}

// =====================================================================
// Orchestration
// =====================================================================
async function seed(): Promise<void> {
  const variant = resolveSeedVariant()
  const supabase = requireServiceClient()

  console.log(`Seeding MedX demo (variant: ${variant})`)

  // 1. Auth users + resolve ids.
  const userIds: Record<string, string> = {}
  for (const user of DEMO_USERS) {
    userIds[user.email] = await ensureAuthUser(supabase, user)
  }
  const ids: DemoUserIds = {
    patientId: userIds['patient@demo'],
    pharmacistId: userIds['pharmacist@demo'],
    physicianId: userIds['physician@demo'],
  }

  // 2. Profiles.
  await ensureProfiles(supabase, ids)

  // 3. Patient record.
  const patientRecordId = await ensurePatient(supabase, ids.patientId)

  // Idempotency: clear prior demo child rows before re-inserting.
  await clearPatientChildRows(supabase, patientRecordId)

  // 4 + 5. Medication list and medications.
  const medicationListId = await seedMedicationList(
    supabase,
    patientRecordId,
    ids.pharmacistId,
    ids.physicianId
  )

  // 6. Monitoring period.
  const monitoringPeriodId = await seedMonitoringPeriod(
    supabase,
    patientRecordId,
    ids.pharmacistId,
    medicationListId,
    variant
  )

  // 7. Weekly submission (lights up Approve / Consultation on patient /review).
  await seedWeeklySubmission(supabase, patientRecordId)

  // 8 + 9. Daily logs and the dizziness side effect.
  await seedDailyLogsAndSideEffect(supabase, patientRecordId, monitoringPeriodId)

  // 10. Pharmacist verified reading.
  await seedVerifiedReading(supabase, patientRecordId, ids.pharmacistId)

  // 11. Day 0 per the demo toggle.
  await seedDayZero(supabase, patientRecordId, monitoringPeriodId, variant)

  console.log('')
  console.log('Seed complete')
  console.log('  patient@demo / demo1234     (Sophie Tremblay)')
  console.log('  pharmacist@demo / demo1234  (Sarah Chen)')
  console.log('  physician@demo / demo1234   (Dr. Marc Lavoie)')
  console.log(`  variant: ${variant}`)
}

seed().catch((err) => {
  console.error(getErrorMessage(err))
  process.exit(1)
})
