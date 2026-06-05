'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findPharmacyById } from '@/lib/pharmacies'
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
  accessCode: string // unique per-patient code issued by the pharmacist
}

type Admin = ReturnType<typeof createAdminClient>

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

interface UnclaimedPatient {
  id: string
  pharmacy_id: string
}

/** Find a patient record by access code that has not yet been claimed. */
async function findUnclaimedPatient(
  admin: Admin,
  code: string
): Promise<UnclaimedPatient | null> {
  const { data } = await admin
    .from('patients')
    .select('id, pharmacy_id, profile_id')
    .eq('access_code', code)
    .maybeSingle()
  if (!data || data.profile_id) return null // missing or already claimed
  return { id: data.id, pharmacy_id: data.pharmacy_id }
}

/** Gate check before the create-account form is shown. */
export async function verifyAccessCode(
  code: string
): Promise<{ error: string } | { ok: true; pharmacyName: string }> {
  const normalized = normalizeCode(code)
  if (!normalized) return { error: 'Enter your access code.' }
  const patient = await findUnclaimedPatient(createAdminClient(), normalized)
  if (!patient) {
    return {
      error: 'That code is not valid or has already been used. Ask your pharmacist for your code.',
    }
  }
  const pharmacy = findPharmacyById(patient.pharmacy_id)
  return { ok: true, pharmacyName: pharmacy?.name ?? 'your pharmacy' }
}

export async function signup(input: SignupInput) {
  if (!input.email || !input.password) {
    return { error: 'Email and password are required.' }
  }
  const code = normalizeCode(input.accessCode)
  const admin = createAdminClient()

  // Resolve the unclaimed patient record this code belongs to.
  const stub = await findUnclaimedPatient(admin, code)
  if (!stub) {
    return { error: 'That access code is not valid or has already been used.' }
  }
  const pharmacyId = stub.pharmacy_id

  // 1. Create the auth user. email_confirm:true lets them sign in immediately.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (createError || !created?.user) {
    return { error: createError?.message ?? 'Could not create your account.' }
  }
  const userId = created.user.id

  // 2. Insert the profile (role patient, linked to the code's pharmacy).
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

  // 3. Claim the pharmacist's patient record: link the profile and store the
  //    patient's own details. The `is null` guard avoids a double-claim race.
  const baseline: BaselineQuestionnaire = {
    schema_version: BASELINE_SCHEMA_VERSION,
    contact: { sexe: input.sexe, phone: input.phone, address: input.address },
  }
  const { data: claimed, error: claimError } = await admin
    .from('patients')
    .update({
      profile_id: userId,
      date_of_birth: input.dateOfBirth,
      baseline_questionnaire: baseline,
      questionnaire_schema_version: BASELINE_SCHEMA_VERSION,
    })
    .eq('id', stub.id)
    .is('profile_id', null)
    .select('id')
    .maybeSingle()
  if (claimError || !claimed) {
    // Could not claim (error, or someone claimed it first). Roll back the user.
    await admin.auth.admin.deleteUser(userId)
    return {
      error: claimError?.message ?? 'That access code was just used. Ask your pharmacist for a new one.',
    }
  }

  // 4. Establish a session via the cookie-bound client.
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
  if (signInError) {
    redirect('/login')
  }

  redirect('/onboarding/consent')
}
