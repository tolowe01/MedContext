'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays, format } from 'date-fns'
import { canTransition } from '@/lib/monitoring-state'
import type { MonitoringPeriod, MonitoringStatus } from '@/lib/types'

export type ActionResult = { success: true } | { error: string }

interface PeriodGuard {
  period: Pick<
    MonitoringPeriod,
    'id' | 'patient_id' | 'pharmacist_id' | 'medication_list_id' | 'status'
  >
  userId: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

/**
 * Shared preamble: authenticate, load the period (RLS scopes to the
 * pharmacist's pharmacy), and assert the caller is the owning pharmacist.
 */
async function loadPeriodForPharmacist(
  periodId: string
): Promise<PeriodGuard | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: period, error } = await supabase
    .from('monitoring_periods')
    .select('id, patient_id, pharmacist_id, medication_list_id, status')
    .eq('id', periodId)
    .single()

  if (error || !period) return { error: 'Monitoring period not found' }
  if (period.pharmacist_id && period.pharmacist_id !== user.id) {
    return { error: 'You are not the pharmacist for this patient' }
  }
  return { period, userId: user.id, supabase }
}

/** Latest weekly_submission for a patient (the row paired with the period). */
async function latestSubmissionId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  patientId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('weekly_submissions')
    .select('id')
    .eq('patient_id', patientId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

function refresh(patientId: string): void {
  revalidatePath(`/patient/${patientId}`)
  revalidatePath('/dashboard')
}

// ---------------------------------------------------------------------
// §4 - Acknowledge a critical alert (status stays critical_alert)
// ---------------------------------------------------------------------
export async function acknowledgeAlert(alertId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: alert } = await supabase
    .from('critical_alerts')
    .select('id, pharmacist_id, patient_id, acknowledged_at')
    .eq('id', alertId)
    .single()

  if (!alert) return { error: 'Alert not found' }
  if (alert.acknowledged_at) return { success: true } // already acknowledged

  const { error } = await supabase
    .from('critical_alerts')
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
    .eq('id', alertId)

  if (error) return { error: error.message }
  if (alert.patient_id) refresh(alert.patient_id)
  return { success: true }
}

// ---------------------------------------------------------------------
// §5 Option 1 - Approve + positive message
// ---------------------------------------------------------------------
export async function approveMonitoring(
  periodId: string,
  message: string
): Promise<ActionResult> {
  const guard = await loadPeriodForPharmacist(periodId)
  if ('error' in guard) return guard
  const { period, userId, supabase } = guard

  if (!canTransition(period.status, ['submitted', 'critical_alert'])) {
    return { error: `Cannot approve from status "${period.status}"` }
  }

  const submissionId = await latestSubmissionId(supabase, period.patient_id)
  if (submissionId) {
    await supabase.from('interventions').insert({
      submission_id: submissionId,
      kind: 'approval',
      payload: { message },
    })
    await supabase
      .from('weekly_submissions')
      .update({ status: 'reviewed', reviewed_at: new Date().toISOString(), reviewed_by: userId })
      .eq('id', submissionId)
  }

  const { error } = await supabase
    .from('monitoring_periods')
    .update({ status: 'approved', pharmacist_decision_at: new Date().toISOString() })
    .eq('id', periodId)

  if (error) return { error: error.message }
  refresh(period.patient_id)
  return { success: true }
}

// ---------------------------------------------------------------------
// §5 Option 2 - Schedule a consultation call
// ---------------------------------------------------------------------
export async function scheduleConsultation(
  periodId: string,
  scheduledForISO: string
): Promise<ActionResult> {
  const guard = await loadPeriodForPharmacist(periodId)
  if ('error' in guard) return guard
  const { period, userId, supabase } = guard

  if (!canTransition(period.status, ['submitted', 'critical_alert'])) {
    return { error: `Cannot schedule a consultation from status "${period.status}"` }
  }

  const { error: consultError } = await supabase.from('consultations').insert({
    monitoring_period_id: periodId,
    pharmacist_id: userId,
    patient_id: period.patient_id,
    scheduled_for: scheduledForISO,
  })
  if (consultError) return { error: consultError.message }

  const submissionId = await latestSubmissionId(supabase, period.patient_id)
  if (submissionId) {
    await supabase.from('interventions').insert({
      submission_id: submissionId,
      kind: 'phone_call',
      payload: { phone_time: scheduledForISO },
    })
    await supabase
      .from('weekly_submissions')
      .update({ status: 'follow_up', reviewed_at: new Date().toISOString(), reviewed_by: userId })
      .eq('id', submissionId)
  }

  const { error } = await supabase
    .from('monitoring_periods')
    .update({
      status: 'consultation_scheduled',
      pharmacist_decision_at: new Date().toISOString(),
    })
    .eq('id', periodId)

  if (error) return { error: error.message }
  refresh(period.patient_id)
  return { success: true }
}

// ---------------------------------------------------------------------
// Shared consultation loader for the post-consultation branch
// ---------------------------------------------------------------------
interface ConsultationLoad {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: { id: string }
  consultation: {
    id: string
    monitoring_period_id: string
    patient_id: string
    pharmacist_id: string | null
  }
  period: {
    id: string
    patient_id: string
    pharmacist_id: string | null
    medication_list_id: string | null
    status: MonitoringStatus
  }
}

async function loadConsultation(
  consultationId: string
): Promise<ConsultationLoad | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: consultation } = await supabase
    .from('consultations')
    .select('id, monitoring_period_id, patient_id, pharmacist_id')
    .eq('id', consultationId)
    .single()
  if (!consultation) return { error: 'Consultation not found' as const }

  const { data: period } = await supabase
    .from('monitoring_periods')
    .select('id, patient_id, pharmacist_id, medication_list_id, status')
    .eq('id', consultation.monitoring_period_id)
    .single()
  if (!period) return { error: 'Monitoring period not found' as const }

  return { supabase, user, consultation, period }
}

// ---------------------------------------------------------------------
// §5 Post-consultation - complete + extend 7 more days
// ---------------------------------------------------------------------
export async function completeConsultationExtend(
  consultationId: string,
  notes: string
): Promise<ActionResult> {
  const loaded = await loadConsultation(consultationId)
  if ('error' in loaded) return { error: loaded.error }
  const { supabase, period, consultation } = loaded

  if (!canTransition(period.status, ['consultation_scheduled'])) {
    return { error: `Cannot complete consultation from status "${period.status}"` }
  }

  await supabase
    .from('consultations')
    .update({ completed_at: new Date().toISOString(), outcome: 'monitor_extended', notes })
    .eq('id', consultationId)

  await supabase
    .from('monitoring_periods')
    .update({ status: 'monitor_extended' })
    .eq('id', period.id)

  const start = new Date()
  const { error } = await supabase.from('monitoring_periods').insert({
    patient_id: period.patient_id,
    pharmacist_id: consultation.pharmacist_id,
    medication_list_id: period.medication_list_id,
    start_date: format(start, 'yyyy-MM-dd'),
    expected_end_date: format(addDays(start, 7), 'yyyy-MM-dd'),
    status: 'active',
  })

  if (error) return { error: error.message }
  refresh(period.patient_id)
  return { success: true }
}

// ---------------------------------------------------------------------
// Internal: write the escalation row + flip status to escalated
// ---------------------------------------------------------------------
async function writeEscalation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  period: { id: string; patient_id: string; medication_list_id: string | null },
  reason: string
): Promise<ActionResult> {
  // Resolve the prescribing physician from the period's medication list.
  let physicianId: string | null = null
  if (period.medication_list_id) {
    const { data: med } = await supabase
      .from('medications')
      .select('prescribing_physician_id')
      .eq('medication_list_id', period.medication_list_id)
      .not('prescribing_physician_id', 'is', null)
      .limit(1)
      .maybeSingle()
    physicianId = med?.prescribing_physician_id ?? null
  }

  const { error: escError } = await supabase.from('physician_escalations').insert({
    monitoring_period_id: period.id,
    pharmacist_id: userId,
    physician_id: physicianId,
    patient_id: period.patient_id,
    reason,
  })
  if (escError) return { error: escError.message }

  // TODO (Phase 2): send the physician a notification email here.

  const { error } = await supabase
    .from('monitoring_periods')
    .update({ status: 'escalated', pharmacist_decision_at: new Date().toISOString() })
    .eq('id', period.id)

  if (error) return { error: error.message }
  refresh(period.patient_id)
  return { success: true }
}

// ---------------------------------------------------------------------
// §5 Option 3 - Immediately escalate to physician
// ---------------------------------------------------------------------
export async function escalateToPhysician(
  periodId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason.trim()) return { error: 'A reason is required to escalate' }

  const guard = await loadPeriodForPharmacist(periodId)
  if ('error' in guard) return guard
  const { period, userId, supabase } = guard

  if (!canTransition(period.status, ['submitted', 'critical_alert', 'consultation_scheduled'])) {
    return { error: `Cannot escalate from status "${period.status}"` }
  }
  return writeEscalation(supabase, userId, period, reason)
}

// ---------------------------------------------------------------------
// §5 Post-consultation - complete + escalate to physician
// ---------------------------------------------------------------------
export async function completeConsultationEscalate(
  consultationId: string,
  reason: string,
  notes: string
): Promise<ActionResult> {
  if (!reason.trim()) return { error: 'A reason is required to escalate' }

  const loaded = await loadConsultation(consultationId)
  if ('error' in loaded) return { error: loaded.error }
  const { supabase, user, period } = loaded

  if (!canTransition(period.status, ['consultation_scheduled'])) {
    return { error: `Cannot complete consultation from status "${period.status}"` }
  }

  await supabase
    .from('consultations')
    .update({
      completed_at: new Date().toISOString(),
      outcome: 'escalated_to_physician',
      notes,
    })
    .eq('id', consultationId)

  return writeEscalation(supabase, user.id, period, reason)
}
