'use server'
import { createClient } from '@/lib/supabase/server'
import type { ExtractedMed } from '@/lib/types'

interface ConfirmResult {
  success?: true
  error?: string
}

interface CreateMonitoringPeriodInput {
  patient_id: string
  medication_list_id: string
  start_date: string
  expected_end_date: string
  preferred_log_time: string
}

interface MedicationListWithMeds {
  id: string
  medications: { name: string }[] | null
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type PharmacistAuth =
  | { error: string }
  | { supabase: SupabaseServerClient; userId: string }

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

async function requirePharmacist(): Promise<PharmacistAuth> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'pharmacist') {
    return { error: 'Only pharmacists can perform this action' }
  }
  return { supabase, userId: user.id }
}

export async function confirmMedications(
  medicationListId: string,
  rows: ExtractedMed[]
): Promise<ConfirmResult> {
  const auth = await requirePharmacist()
  if ('error' in auth) return { error: auth.error }
  const { supabase } = auth

  const { error: deleteError } = await supabase
    .from('medications')
    .delete()
    .eq('medication_list_id', medicationListId)
  if (deleteError) return { error: getErrorMessage(deleteError) }

  const inserts = rows
    .filter((row) => row.name.trim().length > 0)
    .map((row) => ({
      medication_list_id: medicationListId,
      name: row.name,
      dose: row.dose,
      frequency: row.frequency,
      prescribing_physician_name: row.prescribing_physician_name,
      is_new: !!row.is_new,
      notes: row.notes,
    }))

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('medications').insert(inserts)
    if (insertError) return { error: getErrorMessage(insertError) }
  }

  const { error: statusError } = await supabase
    .from('medication_lists')
    .update({ status: 'confirmed' })
    .eq('id', medicationListId)
  if (statusError) return { error: getErrorMessage(statusError) }

  return { success: true }
}

export async function fetchPriorMedicationNames(
  patientId: string,
  excludeListId: string
): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('medication_lists')
    .select('id, medications(name)')
    .eq('patient_id', patientId)
    .eq('status', 'confirmed')
    .neq('id', excludeListId)

  if (error || !data) return []

  const lists = data as MedicationListWithMeds[]
  return lists.flatMap((list) => (list.medications ?? []).map((med) => med.name))
}

export async function createMonitoringPeriod(
  input: CreateMonitoringPeriodInput
): Promise<{ success: true; monitoring_period_id: string } | { error: string }> {
  const auth = await requirePharmacist()
  if ('error' in auth) return { error: auth.error }
  const { supabase, userId } = auth

  const { data: period, error: periodError } = await supabase
    .from('monitoring_periods')
    .insert({
      patient_id: input.patient_id,
      pharmacist_id: userId,
      medication_list_id: input.medication_list_id,
      preferred_log_time: input.preferred_log_time,
      start_date: input.start_date,
      expected_end_date: input.expected_end_date,
      status: 'invited',
    })
    .select('id')
    .single()

  if (periodError || !period) {
    return { error: periodError ? getErrorMessage(periodError) : 'Could not create monitoring period' }
  }

  const { error: submissionError } = await supabase.from('weekly_submissions').insert({
    patient_id: input.patient_id,
    week_start: input.start_date,
    status: 'submitted',
    ai_synthesis_text: null,
  })
  if (submissionError) return { error: getErrorMessage(submissionError) }

  return { success: true, monitoring_period_id: period.id }
}
