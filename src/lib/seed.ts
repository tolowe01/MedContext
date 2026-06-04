import { createClient } from '@supabase/supabase-js'
import { subDays, format } from 'date-fns'

const PHARMACY_ID = '00000000-0000-0000-0000-000000000001'

const DAILY_LOGS = [
  { daysAgo: 6, systolic: 135, diastolic: 85, adherence_taken: true, symptom_note: null },
  { daysAgo: 5, systolic: 138, diastolic: 87, adherence_taken: true, symptom_note: null },
  { daysAgo: 4, systolic: 142, diastolic: 90, adherence_taken: true, symptom_note: null },
  { daysAgo: 3, systolic: 148, diastolic: 94, adherence_taken: false, symptom_note: 'felt dizzy' },
  { daysAgo: 2, systolic: 144, diastolic: 91, adherence_taken: true, symptom_note: null },
  { daysAgo: 1, systolic: 146, diastolic: 93, adherence_taken: true, symptom_note: null },
]

async function seed() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url.includes('placeholder') || serviceKey.includes('placeholder')) {
    console.error('Cannot seed: real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  const findUserId = async (email: string): Promise<string | undefined> => {
    const { data } = await supabase.auth.admin.listUsers()
    return data?.users?.find((u) => u.email === email)?.id
  }

  console.log('Creating patient auth user...')
  const { error: patientAuthError } = await supabase.auth.admin.createUser({
    email: 'patient@demo',
    password: 'demo1234',
    email_confirm: true,
  })
  if (patientAuthError && !patientAuthError.message.includes('already')) {
    console.error('Patient auth error:', patientAuthError.message)
  }

  console.log('Creating pharmacist auth user...')
  const { error: pharmacistAuthError } = await supabase.auth.admin.createUser({
    email: 'pharmacist@demo',
    password: 'demo1234',
    email_confirm: true,
  })
  if (pharmacistAuthError && !pharmacistAuthError.message.includes('already')) {
    console.error('Pharmacist auth error:', pharmacistAuthError.message)
  }

  const patientId = await findUserId('patient@demo')
  const pharmacistId = await findUserId('pharmacist@demo')

  if (!patientId || !pharmacistId) {
    console.error('Cannot proceed without demo user IDs')
    process.exit(1)
  }

  console.log('Creating profiles...')
  await supabase.from('profiles').upsert([
    {
      id: patientId,
      role: 'patient',
      pharmacy_id: PHARMACY_ID,
      first_name: 'Sophie',
      last_name: 'Tremblay',
    },
    {
      id: pharmacistId,
      role: 'pharmacist',
      pharmacy_id: PHARMACY_ID,
      first_name: 'Sarah',
      last_name: 'Chen',
    },
  ])

  console.log('Creating patient record...')
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .upsert(
      {
        profile_id: patientId,
        pharmacy_id: PHARMACY_ID,
        date_of_birth: '1966-01-01',
        access_code: 'DEMO01',
        diagnosis: 'Hypertension',
      },
      { onConflict: 'profile_id' }
    )
    .select('id')
    .single()

  if (patientError || !patient) {
    console.error('Patient record error:', patientError?.message)
    process.exit(1)
  }

  console.log('Inserting daily logs...')
  const logs = DAILY_LOGS.map(({ daysAgo, ...log }) => ({
    ...log,
    patient_id: patient.id,
    log_date: format(subDays(new Date(), daysAgo), 'yyyy-MM-dd'),
    entered_via: 'text',
  }))
  await supabase.from('daily_logs').upsert(logs, { onConflict: 'patient_id,log_date' })

  console.log('Inserting pharmacist verified reading...')
  await supabase.from('pharmacist_verified_readings').insert({
    patient_id: patient.id,
    pharmacist_id: pharmacistId,
    reading_date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    systolic: 152,
    diastolic: 96,
  })

  console.log('Seed complete')
  console.log('  patient@demo / demo1234')
  console.log('  pharmacist@demo / demo1234')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
