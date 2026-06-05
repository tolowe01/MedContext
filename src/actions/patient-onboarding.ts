'use server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/access-code'

interface CreatePatientSuccess {
  success: true
  patient_id: string
  access_code: string
}

type CreatePatientResult = CreatePatientSuccess | { error: string }

const inputSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  email: z.string().trim().email('A valid email is required'),
})

type CreatePatientInput = z.infer<typeof inputSchema>

const DEFAULT_DIAGNOSIS = 'Hypertension'
const MAX_CODE_ATTEMPTS = 5

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function reserveAccessCode(
  service: ReturnType<typeof serviceClient>
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateAccessCode()
    const { data } = await service
      .from('patients')
      .select('id')
      .eq('access_code', candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  return null
}

export async function createPatientAccount(
  input: CreatePatientInput
): Promise<CreatePatientResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  // first_name / last_name / email are collected so the pharmacist can email
  // the code; the patient supplies their own identity when they claim it.
  const { date_of_birth } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: pharmacist } = await supabase
    .from('profiles')
    .select('role, pharmacy_id')
    .eq('id', user.id)
    .single()

  if (!pharmacist || pharmacist.role !== 'pharmacist') {
    return { error: 'Only pharmacists can create patient accounts' }
  }
  if (!pharmacist.pharmacy_id) {
    return { error: 'Your account is not linked to a pharmacy' }
  }
  const pharmacyId = pharmacist.pharmacy_id

  const service = serviceClient()

  const accessCode = await reserveAccessCode(service)
  if (!accessCode) {
    return { error: 'Could not generate a unique access code, please try again' }
  }

  // Create an UNCLAIMED patient record (no auth user, profile_id null). The
  // patient claims it by entering this unique code at /signup, where they set
  // their own email + password and supply their identity.
  const { data: patient, error: patientError } = await service
    .from('patients')
    .insert({
      profile_id: null,
      pharmacy_id: pharmacyId,
      date_of_birth,
      access_code: accessCode,
      diagnosis: DEFAULT_DIAGNOSIS,
    })
    .select('id')
    .single()

  if (patientError || !patient) {
    return { error: patientError ? getErrorMessage(patientError) : 'Could not create patient record' }
  }

  return { success: true, patient_id: patient.id, access_code: accessCode }
}
