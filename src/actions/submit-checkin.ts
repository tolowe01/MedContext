'use server'

import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { checkInSchema, type CheckInInput } from '@/lib/checkin-schema'
import type { DailyLog } from '@/lib/types'

type SubmitCheckInResult =
  | { ok: true; isCritical: boolean; log: DailyLog }
  | {
      ok: false
      code:
        | 'unauthenticated'
        | 'no_patient'
        | 'no_active_period'
        | 'already_logged'
        | 'validation'
        | 'db_error'
      message: string
    }

/**
 * Persist a structured daily check-in for the authenticated patient.
 *
 * The insert (not upsert) is deliberate: the BEFORE INSERT trigger on
 * daily_logs sets is_critical, and an upsert-on-conflict path would not fire
 * it. We read is_critical back via `.select().single()`.
 */
export async function submitCheckIn(
  input: CheckInInput
): Promise<SubmitCheckInResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, code: 'unauthenticated', message: 'You are not signed in.' }
  }

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (patientError || !patient) {
    return { ok: false, code: 'no_patient', message: 'We could not find your patient record.' }
  }

  const parsed = checkInSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation',
      message: 'Some of the entries need to be corrected.',
    }
  }
  const data = parsed.data

  const { data: period, error: periodError } = await supabase
    .from('monitoring_periods')
    .select('id')
    .eq('patient_id', patient.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (periodError) {
    return { ok: false, code: 'db_error', message: 'We could not load your monitoring period.' }
  }
  if (!period) {
    return {
      ok: false,
      code: 'no_active_period',
      message: 'You do not have an active monitoring period.',
    }
  }

  const logDate = format(new Date(), 'yyyy-MM-dd')
  const adherent = data.adherenceTaken

  const { data: log, error: logError } = await supabase
    .from('daily_logs')
    .insert({
      patient_id: patient.id,
      monitoring_period_id: period.id,
      log_date: logDate,
      logged_at_local: data.timeOfReading,
      systolic: data.systolic,
      diastolic: data.diastolic,
      heart_rate: data.heartRate,
      adherence_taken: adherent,
      adherence_skip_reason: adherent ? null : (data.skipReason?.trim() || null),
      entered_via: 'text',
    })
    .select('*')
    .single()

  if (logError) {
    if (logError.code === '23505') {
      return {
        ok: false,
        code: 'already_logged',
        message: 'You have already checked in today.',
      }
    }
    return { ok: false, code: 'db_error', message: 'We could not save your check-in.' }
  }

  const savedLog = log as DailyLog

  // Side effects are only meaningful when the medication was taken. A failure
  // here does not roll back the saved reading; the check-in still succeeds.
  if (adherent && data.sideEffects.length > 0) {
    const rows = data.sideEffects.map((effect) => ({
      daily_log_id: savedLog.id,
      patient_id: patient.id,
      monitoring_period_id: period.id,
      effect_code: effect.code,
      effect_text: effect.code === 'other' ? (effect.text?.trim() || null) : null,
      severity: effect.severity ?? null,
    }))
    await supabase.from('side_effects').insert(rows)
  }

  return { ok: true, isCritical: savedLog.is_critical, log: savedLog }
}
