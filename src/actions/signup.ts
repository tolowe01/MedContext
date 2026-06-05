'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findPharmacyByCode } from '@/lib/pharmacies'
import { BASELINE_SCHEMA_VERSION } from '@/lib/questionnaire-schema'
import { redirect } from 'next/navigation'
import type { BaselineQuestionnaire, Sexe } from '@/lib/types'

export interface SignupInput {
  email: string
  password: string
  firstName: string
  lastName: string
  dateOfBirth: string // YYYY-MM-DD
  sexe: Sexe
  phone: string
  address: string
  accessCode: string // pharmacy enrollment code from the pharmacist
}

function generateAccessCode(): string {
  // Unambiguous characters only (no O/0/I/1).
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function signup(input: SignupInput) {
  if (!input.email || !input.password) {
    return { error: 'Email and password are required.' }
  }
  const pharmacy = findPharmacyByCode(input.accessCode)
  if (!pharmacy) {
    return { error: 'That access code is not valid. Ask your pharmacist for your code.' }
  }
  const pharmacyId = pharmacy.id

  const admin = createAdminClient()

  // 1. Create the auth user. email_confirm:true lets them sign in immediately
  //    (no confirmation email round-trip), matching the seed pattern.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (createError || !created?.user) {
    return { error: createError?.message ?? 'Could not create your account.' }
  }
  const userId = created.user.id

  // 2. Insert the profile + clinical record via the service-role client.
  //    `patients` has SELECT-only RLS, so a normal client insert would be denied.
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    role: 'patient',
    pharmacy_id: pharmacyId,
    first_name: input.firstName,
    last_name: input.lastName,
  })
  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    return { error: profileError.message }
  }

  const baseline: BaselineQuestionnaire = {
    schema_version: BASELINE_SCHEMA_VERSION,
    contact: { sexe: input.sexe, phone: input.phone, address: input.address },
  }
  const { error: patientError } = await admin.from('patients').insert({
    profile_id: userId,
    pharmacy_id: pharmacyId,
    date_of_birth: input.dateOfBirth,
    access_code: generateAccessCode(),
    baseline_questionnaire: baseline,
    questionnaire_schema_version: BASELINE_SCHEMA_VERSION,
  })
  if (patientError) {
    // Deleting the auth user cascades to the profile row we just created.
    await admin.auth.admin.deleteUser(userId)
    return { error: patientError.message }
  }

  // 3. Establish a session for the new user via the cookie-bound client.
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
  if (signInError) {
    // Account exists but auto-login failed; let them sign in manually.
    redirect('/login')
  }

  redirect('/onboarding/consent')
}
